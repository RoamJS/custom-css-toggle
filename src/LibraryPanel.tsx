import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clampLibrarySize, librarySizeLimit, MIN_LIBRARY_SIZE } from "./layout";

const LibraryPanel = ({
  size,
  onResize,
  cancelEpoch,
  children,
}: {
  size: number;
  onResize: (size: number) => void;
  cancelEpoch: number;
  children: React.ReactNode;
}): React.ReactElement => {
  const panel = useRef<HTMLElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState(size + 246);
  const [draft, setDraft] = useState<number | null>(null);
  const width = clampLibrarySize({ requested: draft ?? size, available });

  useLayoutEffect(() => {
    const layout = panel.current?.parentElement;
    if (!layout) return;
    const measure = (): void =>
      setAvailable(layout.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    cleanup.current?.();
    setDraft(null);
  }, [cancelEpoch]);
  useEffect(() => () => cleanup.current?.(), []);

  const resize = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    cleanup.current?.();
    const startX = event.clientX;
    const startWidth = width;
    let next = width;
    const move = (e: PointerEvent): void => {
      next = clampLibrarySize({
        requested: startWidth + e.clientX - startX,
        available:
          panel.current?.parentElement?.getBoundingClientRect().width ??
          available,
      });
      setDraft(next);
    };
    const removeListeners = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      cleanup.current = null;
    };
    const finish = (): void => {
      removeListeners();
      setDraft(null);
      onResize(next);
    };
    const cancel = (): void => {
      removeListeners();
      setDraft(null);
    };
    cleanup.current = removeListeners;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
  };
  const resizeKey = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const values: Record<string, number> = {
      ArrowLeft: width - 24,
      ArrowRight: width + 24,
      Home: MIN_LIBRARY_SIZE,
      End: librarySizeLimit(available),
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    onResize(clampLibrarySize({ requested: values[event.key], available }));
  };

  return (
    <>
      <aside
        ref={panel}
        id="cct-library-panel"
        className="cct-library"
        aria-label="Stylesheets"
        style={{ width }}
      >
        {children}
      </aside>
      <div
        role="separator"
        aria-label="Resize stylesheets panel"
        aria-orientation="vertical"
        aria-controls="cct-library-panel"
        aria-valuemin={MIN_LIBRARY_SIZE}
        aria-valuemax={librarySizeLimit(available)}
        aria-valuenow={width}
        tabIndex={0}
        className="cct-library-resize"
        onPointerDown={resize}
        onKeyDown={resizeKey}
      />
    </>
  );
};

export default LibraryPanel;
