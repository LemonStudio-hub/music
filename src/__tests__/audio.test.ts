import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeAudio, loadAudioFile } from '../audio';

function createMockAudioBuffer(channelData: Float32Array, sampleRate = 44100): AudioBuffer {
  return {
    duration: channelData.length / sampleRate,
    length: channelData.length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: vi.fn(() => channelData),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

describe('analyzeAudio', () => {
  it('should return AnalysisResult with required fields', async () => {
    const silentData = new Float32Array(44100);
    const buffer = createMockAudioBuffer(silentData);
    const result = await analyzeAudio(buffer);
    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('notes');
    expect(result).toHaveProperty('beatGrid');
    expect(result).toHaveProperty('sections');
    expect(Array.isArray(result.notes)).toBe(true);
    expect(Array.isArray(result.beatGrid)).toBe(true);
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.bpm).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should handle short audio buffers', async () => {
    const shortData = new Float32Array(100);
    shortData.fill(0.5);
    const buffer = createMockAudioBuffer(shortData);
    const result = await analyzeAudio(buffer);
    expect(result.bpm).toBeGreaterThan(0);
    expect(Array.isArray(result.notes)).toBe(true);
  });

  it('should detect notes sorted by time', async () => {
    const data = new Float32Array(44100 * 3);
    for (let i = 44100; i < 44500; i++) data[i] = 0.9;
    for (let i = 88200; i < 88600; i++) data[i] = 0.9;

    const originalOffline = globalThis.OfflineAudioContext;
    class TestOfflineAudioContext {
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }));
      destination = {};
      startRendering = vi.fn().mockResolvedValue({
        getChannelData: vi.fn(() => data),
        length: data.length,
        sampleRate: 44100,
      });
      constructor(_ch: number, _len: number, _sr: number) {}
    }
    vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext);

    const buffer = createMockAudioBuffer(data);
    const result = await analyzeAudio(buffer);

    for (let i = 1; i < result.notes.length; i++) {
      expect(result.notes[i].time).toBeGreaterThanOrEqual(result.notes[i - 1].time);
    }

    vi.stubGlobal('OfflineAudioContext', originalOffline);
  });

  it('should assign lanes in range 0-3', async () => {
    const data = new Float32Array(44100 * 2);
    for (let i = 22050; i < 23000; i++) data[i] = 0.8;
    for (let i = 44100; i < 45000; i++) data[i] = 0.8;

    const originalOffline = globalThis.OfflineAudioContext;
    class TestOfflineAudioContext {
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }));
      destination = {};
      startRendering = vi.fn().mockResolvedValue({
        getChannelData: vi.fn(() => data),
        length: data.length,
        sampleRate: 44100,
      });
      constructor(_ch: number, _len: number, _sr: number) {}
    }
    vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext);

    const buffer = createMockAudioBuffer(data);
    const result = await analyzeAudio(buffer);

    for (const note of result.notes) {
      expect(note.lane).toBeGreaterThanOrEqual(0);
      expect(note.lane).toBeLessThanOrEqual(3);
      expect(note.intensity).toBeGreaterThanOrEqual(0);
      expect(note.intensity).toBeLessThanOrEqual(1);
    }

    vi.stubGlobal('OfflineAudioContext', originalOffline);
  });

  it('should generate more notes on hard difficulty', async () => {
    const data = new Float32Array(44100 * 3);
    for (let i = 22050; i < 23000; i++) data[i] = 0.8;
    for (let i = 44100; i < 45000; i++) data[i] = 0.8;
    for (let i = 66150; i < 67000; i++) data[i] = 0.8;
    for (let i = 88200; i < 89000; i++) data[i] = 0.8;

    const originalOffline = globalThis.OfflineAudioContext;
    class TestOfflineAudioContext {
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }));
      destination = {};
      startRendering = vi.fn().mockResolvedValue({
        getChannelData: vi.fn(() => data),
        length: data.length,
        sampleRate: 44100,
      });
      constructor(_ch: number, _len: number, _sr: number) {}
    }
    vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext);

    const buffer = createMockAudioBuffer(data);
    const easy = await analyzeAudio(buffer, 'easy');
    const hard = await analyzeAudio(buffer, 'hard');

    // Hard should have at least as many notes as easy
    expect(hard.notes.length).toBeGreaterThanOrEqual(easy.notes.length);

    vi.stubGlobal('OfflineAudioContext', originalOffline);
  });

  it('should detect BPM in valid range', async () => {
    const data = new Float32Array(44100 * 5);
    // Create periodic beats at ~120 BPM
    const beatInterval = Math.floor(44100 * 0.5); // 120 BPM
    for (let i = 0; i < data.length; i += beatInterval) {
      for (let j = 0; j < 500 && i + j < data.length; j++) {
        data[i + j] = 0.8;
      }
    }

    const originalOffline = globalThis.OfflineAudioContext;
    class TestOfflineAudioContext {
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }));
      destination = {};
      startRendering = vi.fn().mockResolvedValue({
        getChannelData: vi.fn(() => data),
        length: data.length,
        sampleRate: 44100,
      });
      constructor(_ch: number, _len: number, _sr: number) {}
    }
    vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext);

    const buffer = createMockAudioBuffer(data);
    const result = await analyzeAudio(buffer);

    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(200);

    vi.stubGlobal('OfflineAudioContext', originalOffline);
  });

  it('should generate beat grid covering duration', async () => {
    const data = new Float32Array(44100 * 3);
    const buffer = createMockAudioBuffer(data);
    const result = await analyzeAudio(buffer);

    if (result.beatGrid.length > 0) {
      expect(result.beatGrid[0]).toBeGreaterThanOrEqual(0);
      expect(result.beatGrid[result.beatGrid.length - 1]).toBeLessThanOrEqual(result.duration + 1);
    }
  });

  it('should detect sections', async () => {
    const data = new Float32Array(44100 * 10);
    // Create energy variation
    for (let i = 0; i < data.length; i++) {
      const t = i / 44100;
      data[i] = Math.sin(t * 2) * 0.5 * (0.5 + 0.5 * Math.sin(t * 0.3));
    }

    const originalOffline = globalThis.OfflineAudioContext;
    class TestOfflineAudioContext {
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }));
      destination = {};
      startRendering = vi.fn().mockResolvedValue({
        getChannelData: vi.fn(() => data),
        length: data.length,
        sampleRate: 44100,
      });
      constructor(_ch: number, _len: number, _sr: number) {}
    }
    vi.stubGlobal('OfflineAudioContext', TestOfflineAudioContext);

    const buffer = createMockAudioBuffer(data);
    const result = await analyzeAudio(buffer);

    expect(result.sections.length).toBeGreaterThan(0);
    for (const section of result.sections) {
      expect(section.startTime).toBeLessThan(section.endTime);
      expect(['intro', 'verse', 'chorus', 'bridge', 'outro']).toContain(section.type);
      expect(section.intensity).toBeGreaterThan(0);
    }

    vi.stubGlobal('OfflineAudioContext', originalOffline);
  });
});

describe('loadAudioFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should decode audio file and return AudioBuffer', async () => {
    const mockBuffer = createMockAudioBuffer(new Float32Array([0, 0, 0]));

    const originalAudio = globalThis.AudioContext;
    class TestAudioContext {
      decodeAudioData = vi.fn().mockResolvedValue(mockBuffer);
      close = vi.fn().mockResolvedValue(undefined);
    }
    vi.stubGlobal('AudioContext', TestAudioContext);

    const file = new File([new ArrayBuffer(100)], 'test.mp3', {
      type: 'audio/mpeg',
    });
    const result = await loadAudioFile(file);

    expect(result).toBe(mockBuffer);

    vi.stubGlobal('AudioContext', originalAudio);
  });

  it('should throw when AudioContext is not available', async () => {
    const originalAudio = globalThis.AudioContext;
    const originalWebkit = (globalThis as Record<string, unknown>).webkitAudioContext;
    // @ts-expect-error testing missing AudioContext
    delete globalThis.AudioContext;
    // @ts-expect-error testing missing AudioContext
    delete globalThis.webkitAudioContext;

    const file = new File([new ArrayBuffer(100)], 'test.mp3', {
      type: 'audio/mpeg',
    });
    await expect(loadAudioFile(file)).rejects.toThrow('AudioContext not supported');

    globalThis.AudioContext = originalAudio;
    if (originalWebkit) {
      (globalThis as Record<string, unknown>).webkitAudioContext = originalWebkit;
    }
  });
});
