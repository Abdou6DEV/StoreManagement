/** Coalesce rapid events (e.g. scroll) into one callback per animation frame. */
export function coalesceOnAnimationFrame(callback: () => void): {
  schedule: () => void;
  cancel: () => void;
} {
  let frameId = 0;

  const schedule = () => {
    if (frameId !== 0) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      callback();
    });
  };

  const cancel = () => {
    if (frameId === 0) return;
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  return { schedule, cancel };
}
