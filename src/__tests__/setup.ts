import { vi, beforeEach } from 'vitest';

// Mock canvas getContext
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  save: vi.fn(),
  restore: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  shadowBlur: 0,
  shadowColor: '',
  font: '',
  textAlign: '' as CanvasTextAlign,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// Override getContext to return mock
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
): ReturnType<typeof HTMLCanvasElement.prototype.getContext> {
  if (contextId === '2d') {
    return mockCtx as unknown as CanvasRenderingContext2D;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

// Mock matchMedia
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: query.includes('none'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

// Mock OfflineAudioContext as a class
class MockOfflineAudioContext {
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  }));
  destination = {};
  startRendering = vi.fn().mockResolvedValue({
    getChannelData: vi.fn(() => new Float32Array(0)),
    length: 0,
    sampleRate: 44100,
  });

  constructor(_channels: number, _length: number, _sampleRate: number) {}
}

vi.stubGlobal('OfflineAudioContext', MockOfflineAudioContext);

// Mock AudioContext as a class
class MockAudioContext {
  currentTime = 0;
  destination = {};
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 10,
    length: 441000,
    sampleRate: 44100,
  });
  close = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
}

vi.stubGlobal('AudioContext', MockAudioContext);

// Export mock for use in tests
export { mockCtx };
