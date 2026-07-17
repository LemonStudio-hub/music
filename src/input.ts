/**
 * Input handling - keyboard, touch zones, file drag/drop
 */

type HitCallback = (e: PointerEvent | null) => void;
type HitAtCallback = (lane: number, x: number, y: number) => void;
type FileCallback = (file: File, fileNameEl: HTMLDivElement) => void;

export function setupKeyboard(onHit: HitCallback, onTogglePause: () => void): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      onHit(null);
    }
    if (e.code === 'Escape') onTogglePause();
  });
}

export function setupTouchZones(onHitAt: HitAtCallback): void {
  document.querySelectorAll<HTMLElement>('.touch-zone').forEach(zone => {
    zone.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      const lane = parseInt(zone.dataset.lane ?? '0', 10);
      onHitAt(lane, e.clientX, e.clientY);
    });
  });
}

export function setupCanvas(canvas: HTMLCanvasElement, onHit: HitCallback): void {
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    onHit(e);
  });
}

export function setupFileInput(onFileLoaded: FileCallback): void {
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const fileName = document.getElementById('file-name') as HTMLDivElement;

  dropZone.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files?.[0]) onFileLoaded(files[0], fileName);
  });

  fileInput.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files?.[0]) onFileLoaded(files[0], fileName);
  });
}
