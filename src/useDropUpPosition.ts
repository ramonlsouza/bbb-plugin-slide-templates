import { RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { PANEL_WIDTH_REM } from './styles';

// Opens the panel as a drop-up of the Templates button, as the core "Media Sharing" panel opens from its
// button: above it, left edges aligned, kept inside the window, at most 37rem tall. The floating window of the
// plugin SDK places a window only through dragging, so the window is fixed and the panel places itself.

export const BUTTON_SELECTOR = '[data-test="slideTemplatesButton"]';

// Where the panel went before it was a drop-up, used when the Templates button is not on the page.
const FALLBACK = { top: 80, left: 420 };

export interface DropUpPosition {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const rem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

export const computeDropUpPosition = (): DropUpPosition => {
  const r = rem();
  const button = document.querySelector(BUTTON_SELECTOR);
  if (!button) {
    return { ...FALLBACK, maxHeight: Math.min(window.innerHeight - FALLBACK.top - r, 37 * r) };
  }
  const rect = button.getBoundingClientRect();
  const width = PANEL_WIDTH_REM * r;
  const left = Math.max(r, Math.min(rect.left, window.innerWidth - width - r));
  return {
    left,
    bottom: window.innerHeight - rect.top + 0.5 * r,
    maxHeight: Math.min(rect.top - 1.5 * r, 37 * r),
  };
};

const samePosition = (a: DropUpPosition, b: DropUpPosition): boolean => a.left === b.left && a.top === b.top
  && a.bottom === b.bottom && a.maxHeight === b.maxHeight;

// Follows the button while the panel is open. The core lays the presentation toolbar out again some time after a
// window resize, with no event the plugin can listen to; so the position is read once per frame and the panel
// re-renders only when it changed.
export function useDropUpPosition(): DropUpPosition {
  const [position, setPosition] = useState<DropUpPosition>(computeDropUpPosition);

  useLayoutEffect(() => {
    let frame = 0;
    const follow = () => {
      const next = computeDropUpPosition();
      setPosition((prev) => (samePosition(prev, next) ? prev : next));
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, []);

  return position;
}

// Closes the panel on Escape and on a press outside it. A press on the Templates button is left to the button,
// which toggles the panel; closing here too would close it and open it again.
export function useCloseOnOutside(panel: RefObject<HTMLElement>, onClose: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || panel.current?.contains(target) || target.closest?.(BUTTON_SELECTOR)) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Capture phase: the whiteboard handles its own pointer events and may stop them from bubbling.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [panel, onClose]);
}
