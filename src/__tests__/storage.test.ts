import { describe, it, expect, vi } from 'vitest';
import { hasStoredAudio, getStoredMeta, clearStoredAudio } from '@/storage';

describe('storage', () => {
  describe('hasStoredAudio', () => {
    it('should return false when APIs are unavailable', async () => {
      vi.stubGlobal('navigator', undefined);
      vi.stubGlobal('indexedDB', undefined);
      const result = await hasStoredAudio();
      expect(result).toBe(false);
    });

    it('should return false when OPFS throws and no IDB', async () => {
      vi.stubGlobal('navigator', {
        storage: { getDirectory: vi.fn(() => Promise.reject(new Error('no opfs'))) },
      });
      vi.stubGlobal('indexedDB', undefined);
      const result = await hasStoredAudio();
      expect(result).toBe(false);
    });
  });

  describe('getStoredMeta', () => {
    it('should return null when APIs are unavailable', async () => {
      vi.stubGlobal('navigator', undefined);
      vi.stubGlobal('indexedDB', undefined);
      const result = await getStoredMeta();
      expect(result).toBeNull();
    });
  });

  describe('clearStoredAudio', () => {
    it('should not throw when APIs are unavailable', async () => {
      vi.stubGlobal('navigator', undefined);
      vi.stubGlobal('indexedDB', undefined);
      await expect(clearStoredAudio()).resolves.toBeUndefined();
    });

    it('should not throw when OPFS directory does not exist', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          getDirectory: vi.fn(() => ({
            removeEntry: vi.fn(() => Promise.reject(new Error('not found'))),
          })),
        },
      });
      vi.stubGlobal('indexedDB', undefined);
      await expect(clearStoredAudio()).resolves.toBeUndefined();
    });
  });
});
