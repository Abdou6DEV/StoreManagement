import { AsyncLocalStorage } from "node:async_hooks";
import type { LastStoreQuery } from "./storeQueryMemory";

export type SessionChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WorkStatus = {
  phase: "thinking" | "tool" | "writing";
  toolName?: string;
};

export type AiSession = {
  webContentsId: number;
  conversationHistory: SessionChatMessage[];
  currentUserName?: string;
  selectedModelId?: string;
  lastStoreQuery: LastStoreQuery | null;
  reuseLastQuery: boolean;
  lastLatinQ: string | null;
};

export type AiRequestContext = {
  session: AiSession;
  statusSink: ((status: WorkStatus) => void) | null;
  chunkSink?: ((text: string) => void) | null;
};

const sessions = new Map<number, AiSession>();
const sessionRuns = new Map<number, Promise<unknown>>();
const als = new AsyncLocalStorage<AiRequestContext>();

export function getOrCreateSession(webContentsId: number): AiSession {
  let session = sessions.get(webContentsId);
  if (!session) {
    session = {
      webContentsId,
      conversationHistory: [],
      lastStoreQuery: null,
      reuseLastQuery: false,
      lastLatinQ: null,
    };
    sessions.set(webContentsId, session);
  }
  return session;
}

export function resetSessionChat(webContentsId: number) {
  const session = getOrCreateSession(webContentsId);
  session.conversationHistory = [];
  session.currentUserName = undefined;
  session.lastStoreQuery = null;
  session.reuseLastQuery = false;
  session.lastLatinQ = null;
}

export function dropSession(webContentsId: number) {
  sessions.delete(webContentsId);
  sessionRuns.delete(webContentsId);
}

export function enqueueAiSession<T>(
  webContentsId: number,
  fn: () => Promise<T>
): Promise<T> {
  const previous = sessionRuns.get(webContentsId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  sessionRuns.set(
    webContentsId,
    previous.then(
      () => gate,
      () => gate
    )
  );

  return (async () => {
    try {
      await previous;
    } catch {
      // Previous request failed; still run this one.
    }
    try {
      return await fn();
    } finally {
      release();
    }
  })();
}

export function runWithAiRequest<T>(
  ctx: AiRequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return als.run(ctx, fn);
}

export function aiRequest(): AiRequestContext | undefined {
  return als.getStore();
}

export function currentSession(): AiSession | undefined {
  return als.getStore()?.session;
}
