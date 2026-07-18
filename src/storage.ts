/**
 * Audio persistence with OPFS primary + IndexedDB fallback.
 * Stores uploaded audio so users don't re-upload on next visit.
 */

const STORE_DIR = 'audio-cache';
const META_KEY = 'meta';
const AUDIO_KEY = 'audio';
const IDB_DB = 'music-blocks';
const IDB_STORE = 'audio-cache';

interface StoredMeta {
  fileName: string;
  sampleRate: number;
  duration: number;
  channels: number;
  length: number;
  storedAt: number;
}

// ─── Storage backend detection ───────────────────────────────────────────────

let opfsAvailable: boolean | null = null;

async function isOpfsAvailable(): Promise<boolean> {
  if (opfsAvailable !== null) return opfsAvailable;
  try {
    const storage = navigator.storage as
      { getDirectory?: () => Promise<FileSystemDirectoryHandle> } | undefined;
    if (!storage?.getDirectory) {
      opfsAvailable = false;
      return false;
    }
    const root = await storage.getDirectory();
    // Test write
    const testFile = await root.getFileHandle('__opfs_test__', { create: true });
    const w = await testFile.createWritable();
    await w.write(new Uint8Array([1]));
    await w.close();
    await root.removeEntry('__opfs_test__');
    opfsAvailable = true;
    return true;
  } catch {
    opfsAvailable = false;
    return false;
  }
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve: (db: IDBDatabase) => void, reject: (err: Error) => void) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(new Error(String(req.error)));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openIDB();
  return new Promise((resolve: (val: T | undefined) => void, reject: (err: Error) => void) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = (): void => resolve(req.result as T | undefined);
    req.onerror = (): void => reject(new Error(String(req.error)));
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve: () => void, reject: (err: Error) => void) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(value, key);
    req.onsuccess = (): void => resolve();
    req.onerror = (): void => reject(new Error(String(req.error)));
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve: () => void, reject: (err: Error) => void) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(key);
    req.onsuccess = (): void => resolve();
    req.onerror = (): void => reject(new Error(String(req.error)));
  });
}

// ─── OPFS helpers ────────────────────────────────────────────────────────────

async function opfsGetRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

async function opfsGetStoreDir(): Promise<FileSystemDirectoryHandle> {
  const root = await opfsGetRoot();
  return await root.getDirectoryHandle(STORE_DIR, { create: true });
}

// ─── Interleave / De-interleave ──────────────────────────────────────────────

function interleave(buffer: AudioBuffer): {
  data: Float32Array;
  meta: Omit<StoredMeta, 'fileName' | 'storedAt'>;
} {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const data = new Float32Array(length * channels);

  for (let ch = 0; ch < channels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i * channels + ch] = channelData[i];
    }
  }

  return {
    data,
    meta: {
      sampleRate: buffer.sampleRate,
      duration: buffer.duration,
      channels,
      length,
    },
  };
}

function deinterleave(interleaved: Float32Array, meta: StoredMeta): AudioBuffer {
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
  if (!AudioCtx) throw new Error('AudioContext not supported');

  const audioCtx = new AudioCtx();
  const buffer = audioCtx.createBuffer(meta.channels, meta.length, meta.sampleRate);

  for (let ch = 0; ch < meta.channels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < meta.length; i++) {
      channelData[i] = interleaved[i * meta.channels + ch];
    }
  }

  return buffer;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function hasStoredAudio(): Promise<boolean> {
  try {
    if (await isOpfsAvailable()) {
      const dir = await opfsGetStoreDir();
      await dir.getFileHandle(META_KEY);
      await dir.getFileHandle(AUDIO_KEY);
      return true;
    }
    // IndexedDB fallback
    const meta = await idbGet<StoredMeta>(META_KEY);
    const audio = await idbGet<ArrayBuffer>(AUDIO_KEY);
    return meta !== undefined && audio !== undefined;
  } catch {
    return false;
  }
}

export async function getStoredMeta(): Promise<StoredMeta | null> {
  try {
    if (await isOpfsAvailable()) {
      const dir = await opfsGetStoreDir();
      const handle = await dir.getFileHandle(META_KEY);
      const file = await handle.getFile();
      return JSON.parse(await file.text()) as StoredMeta;
    }
    return (await idbGet<StoredMeta>(META_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function storeAudioBuffer(buffer: AudioBuffer, fileName: string): Promise<void> {
  const { data, meta } = interleave(buffer);
  const fullMeta: StoredMeta = { ...meta, fileName, storedAt: Date.now() };

  if (await isOpfsAvailable()) {
    const dir = await opfsGetStoreDir();

    const audioHandle = await dir.getFileHandle(AUDIO_KEY, { create: true });
    const audioWritable = await audioHandle.createWritable();
    await audioWritable.write(data.buffer as ArrayBuffer);
    await audioWritable.close();

    const metaHandle = await dir.getFileHandle(META_KEY, { create: true });
    const metaWritable = await metaHandle.createWritable();
    await metaWritable.write(JSON.stringify(fullMeta));
    await metaWritable.close();
  } else {
    await idbPut(META_KEY, fullMeta);
    await idbPut(AUDIO_KEY, data.buffer);
  }
}

export async function loadStoredAudio(): Promise<{ buffer: AudioBuffer; fileName: string } | null> {
  try {
    let meta: StoredMeta | undefined;
    let arrayBuffer: ArrayBuffer | undefined;

    if (await isOpfsAvailable()) {
      const dir = await opfsGetStoreDir();

      const metaHandle = await dir.getFileHandle(META_KEY);
      const metaFile = await metaHandle.getFile();
      meta = JSON.parse(await metaFile.text()) as StoredMeta;

      const audioHandle = await dir.getFileHandle(AUDIO_KEY);
      const audioFile = await audioHandle.getFile();
      arrayBuffer = await audioFile.arrayBuffer();
    } else {
      meta = await idbGet<StoredMeta>(META_KEY);
      arrayBuffer = await idbGet<ArrayBuffer>(AUDIO_KEY);
    }

    if (!meta || !arrayBuffer) return null;

    const interleaved = new Float32Array(arrayBuffer);
    const buffer = deinterleave(interleaved, meta);

    return { buffer, fileName: meta.fileName };
  } catch {
    return null;
  }
}

export async function clearStoredAudio(): Promise<void> {
  try {
    if (await isOpfsAvailable()) {
      const root = await opfsGetRoot();
      await root.removeEntry(STORE_DIR, { recursive: true });
    } else {
      await idbDelete(META_KEY);
      await idbDelete(AUDIO_KEY);
    }
  } catch {
    // Might not exist
  }
}
