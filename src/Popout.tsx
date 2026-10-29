import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button, Portal } from "@blueprintjs/core";
import {
  clampPopoutBounds,
  MIN_POPOUT_HEIGHT,
  MIN_POPOUT_WIDTH,
  POPOUT_MARGIN,
  PopoutBounds,
} from "./popoutGeometry";

type Props = {
  children: React.ReactNode;
  actions?: React.ReactNode;
  bounds: PopoutBounds;
  onBoundsChange: (bounds: PopoutBounds) => void;
  onClose: () => void;
  cancelEpoch: number;
};
type Viewport = { width: number; height: number };
type Gesture = "move" | "resize";
const readViewport = (): Viewport => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
const changeBounds = ({
  bounds,
  mode,
  dx,
  dy,
  viewport,
}: {
  bounds: PopoutBounds;
  mode: Gesture;
  dx: number;
  dy: number;
  viewport: Viewport;
}): PopoutBounds => {
  if (mode === "move")
    return clampPopoutBounds({
      bounds: { ...bounds, x: bounds.x + dx, y: bounds.y + dy },
      viewport,
    });
  return clampPopoutBounds({
    bounds: {
      ...bounds,
      width: Math.min(
        Math.max(MIN_POPOUT_WIDTH, bounds.width + dx),
        viewport.width - POPOUT_MARGIN - bounds.x,
      ),
      height: Math.min(
        Math.max(MIN_POPOUT_HEIGHT, bounds.height + dy),
        viewport.height - POPOUT_MARGIN - bounds.y,
      ),
    },
    viewport,
  });
};

const Popout = ({
  children,
  actions,
  bounds,
  onBoundsChange,
  onClose,
  cancelEpoch,
}: Props): React.ReactElement => {
  const [viewport, setViewport] = useState(readViewport);
  const [draft, setDraft] = useState<PopoutBounds | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onBoundsChange, onClose, cancelEpoch });
  callbacks.current = { onBoundsChange, onClose, cancelEpoch };
  const displayed = clampPopoutBounds({ bounds: draft ?? bounds, viewport });
  const cancelGesture = useCallback((): void => {
    cleanup.current?.();
    setDraft(null);
  }, []);

  useLayoutEffect(() => {
    cancelGesture();
  }, [
    cancelEpoch,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    cancelGesture,
  ]);
  useEffect(() => () => cleanup.current?.(), []);
  useLayoutEffect(() => {
    const resizeViewport = (): void => {
      cancelGesture();
      setViewport(readViewport());
    };
    window.addEventListener("resize", resizeViewport);
    return () => window.removeEventListener("resize", resizeViewport);
  }, [cancelGesture]);

  const startGesture = ({
    event,
    mode,
  }: {
    event: React.PointerEvent<HTMLElement>;
    mode: Gesture;
  }): void => {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    event.currentTarget.focus();
    cancelGesture();
    const start = { x: event.clientX, y: event.clientY, bounds: displayed };
    const epoch = cancelEpoch;
    const pointerId = event.pointerId;
    let next = displayed;
    const move = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return;
      next = changeBounds({
        bounds: start.bounds,
        mode,
        dx: e.clientX - start.x,
        dy: e.clientY - start.y,
        viewport: readViewport(),
      });
      setDraft(next);
    };
    const removeListeners = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", key, true);
      cleanup.current = null;
    };
    const finish = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return;
      next = changeBounds({
        bounds: start.bounds,
        mode,
        dx: e.clientX - start.x,
        dy: e.clientY - start.y,
        viewport: readViewport(),
      });
      removeListeners();
      setDraft(null);
      if (callbacks.current.cancelEpoch === epoch)
        callbacks.current.onBoundsChange(
          clampPopoutBounds({ bounds: next, viewport: readViewport() }),
        );
    };
    const cancel = (): void => {
      removeListeners();
      setDraft(null);
    };
    const key = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cancel();
    };
    cleanup.current = removeListeners;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", key, true);
  };
  const changeWithKeyboard = ({
    event,
    mode,
  }: {
    event: React.KeyboardEvent<HTMLElement>;
    mode: Gesture;
  }): void => {
    const step = event.shiftKey ? 40 : 10;
    const offsets: Record<string, { dx: number; dy: number }> = {
      ArrowLeft: { dx: -step, dy: 0 },
      ArrowRight: { dx: step, dy: 0 },
      ArrowUp: { dx: 0, dy: -step },
      ArrowDown: { dx: 0, dy: step },
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    cancelGesture();
    callbacks.current.onBoundsChange(
      changeBounds({
        bounds: displayed,
        mode,
        ...offsets[event.key],
        viewport: readViewport(),
      }),
    );
  };

  return (
    <Portal
      className="cct-portal cct-popout-portal"
      container={
        document.querySelector<HTMLElement>(".roam-lift-modal") ?? document.body
      }
    >
      <div
        className="cct-popout"
        role="dialog"
        aria-label="Custom CSS Toggle"
        data-cct-owned="true"
        style={{
          left: displayed.x,
          top: displayed.y,
          width: displayed.width,
          height: displayed.height,
        }}
      >
        <header className="cct-popout-header cct-editor-header">
          <Button
            minimal
            icon="move"
            text="Custom CSS Toggle"
            className="cct-popout-move"
            aria-label="Move CSS editor"
            title="Drag to move. Use arrow keys to move; Shift moves farther."
            onPointerDown={(event) => startGesture({ event, mode: "move" })}
            onKeyDown={(event) => changeWithKeyboard({ event, mode: "move" })}
          />
          {actions}
          <Button
            minimal
            icon="cross"
            aria-label="Close"
            onClick={() => {
              cancelGesture();
              callbacks.current.onClose();
            }}
          />
        </header>
        <div className="cct-popout-content">{children}</div>
        <Button
          minimal
          small
          icon="expand-all"
          className="cct-popout-resize"
          aria-label="Resize popout"
          title="Drag to resize. Use arrow keys to resize; Shift changes more."
          onPointerDown={(event) => startGesture({ event, mode: "resize" })}
          onKeyDown={(event) => changeWithKeyboard({ event, mode: "resize" })}
        />
      </div>
    </Portal>
  );
};

export default Popout;
