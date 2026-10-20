import { EventEmitter } from "node:events";

export type MobileSyncChange = {
  model: string;
  action: string;
  transactional: boolean;
};

const changes = new EventEmitter();

export function notifyMobileSyncChange(change: MobileSyncChange): void {
  changes.emit("change", change);
}

export function onMobileSyncChange(
  listener: (change: MobileSyncChange) => void,
): () => void {
  changes.on("change", listener);
  return () => changes.off("change", listener);
}
