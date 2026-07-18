import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupKeyboard, setupTouchZones, setupCanvas, setupFileInput } from '@/input';

describe('setupKeyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should call onHit with null on Space key', () => {
    const onHit = vi.fn();
    const onTogglePause = vi.fn();
    setupKeyboard(onHit, onTogglePause);

    const event = new KeyboardEvent('keydown', { code: 'Space' });
    document.dispatchEvent(event);

    expect(onHit).toHaveBeenCalledWith(null);
  });

  it('should call onTogglePause on Escape key', () => {
    const onHit = vi.fn();
    const onTogglePause = vi.fn();
    setupKeyboard(onHit, onTogglePause);

    const event = new KeyboardEvent('keydown', { code: 'Escape' });
    document.dispatchEvent(event);

    expect(onTogglePause).toHaveBeenCalled();
  });

  it('should prevent default on Space key', () => {
    const onHit = vi.fn();
    const onTogglePause = vi.fn();
    setupKeyboard(onHit, onTogglePause);

    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('should not call onHit on other keys', () => {
    const onHit = vi.fn();
    const onTogglePause = vi.fn();
    setupKeyboard(onHit, onTogglePause);

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

    expect(onHit).not.toHaveBeenCalled();
    expect(onTogglePause).not.toHaveBeenCalled();
  });
});

describe('setupTouchZones', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="touch-zone" data-lane="0"></div>
      <div class="touch-zone" data-lane="1"></div>
      <div class="touch-zone" data-lane="2"></div>
      <div class="touch-zone" data-lane="3"></div>
    `;
  });

  it('should call onHitAt with correct lane on pointerdown', () => {
    const onHitAt = vi.fn();
    setupTouchZones(onHitAt);

    const zone = document.querySelector<HTMLElement>('[data-lane="2"]')!;
    zone.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }),
    );

    expect(onHitAt).toHaveBeenCalledWith(2, 100, 200);
  });

  it('should prevent default on pointerdown', () => {
    const onHitAt = vi.fn();
    setupTouchZones(onHitAt);

    const zone = document.querySelector<HTMLElement>('[data-lane="0"]')!;
    const event = new PointerEvent('pointerdown', {
      clientX: 0,
      clientY: 0,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    zone.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('should set up listeners on all touch zones', () => {
    const onHitAt = vi.fn();
    setupTouchZones(onHitAt);

    const zones = document.querySelectorAll<HTMLElement>('.touch-zone');
    expect(zones.length).toBe(4);
  });
});

describe('setupCanvas', () => {
  it('should call onHit on pointerdown', () => {
    const canvas = document.createElement('canvas');
    const onHit = vi.fn();
    setupCanvas(canvas, onHit);

    const event = new PointerEvent('pointerdown', { clientX: 100, clientY: 200 });
    canvas.dispatchEvent(event);

    expect(onHit).toHaveBeenCalledWith(event);
  });
});

describe('setupFileInput', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="drop-zone"></div>
      <input type="file" id="file-input" />
      <div id="file-name"></div>
    `;
  });

  it('should call onFileLoaded on file input change', () => {
    const onFileLoaded = vi.fn();
    setupFileInput(onFileLoaded);

    const input = document.getElementById('file-input') as HTMLInputElement;
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    input.dispatchEvent(new Event('change'));

    expect(onFileLoaded).toHaveBeenCalledWith(file, document.getElementById('file-name'));
  });

  it('should add dragover class on dragover', () => {
    const onFileLoaded = vi.fn();
    setupFileInput(onFileLoaded);

    const dropZone = document.getElementById('drop-zone')!;
    dropZone.dispatchEvent(new Event('dragover', { bubbles: true }));

    expect(dropZone.classList.contains('dragover')).toBe(true);
  });

  it('should remove dragover class on dragleave', () => {
    const onFileLoaded = vi.fn();
    setupFileInput(onFileLoaded);

    const dropZone = document.getElementById('drop-zone')!;
    dropZone.classList.add('dragover');
    dropZone.dispatchEvent(new Event('dragleave', { bubbles: true }));

    expect(dropZone.classList.contains('dragover')).toBe(false);
  });

  it('should not call onFileLoaded when no file selected', () => {
    const onFileLoaded = vi.fn();
    setupFileInput(onFileLoaded);

    const input = document.getElementById('file-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: null,
      writable: false,
    });
    input.dispatchEvent(new Event('change'));

    expect(onFileLoaded).not.toHaveBeenCalled();
  });

  it('should handle dragover preventDefault', () => {
    const onFileLoaded = vi.fn();
    setupFileInput(onFileLoaded);

    const dropZone = document.getElementById('drop-zone')!;
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    dropZone.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });
});
