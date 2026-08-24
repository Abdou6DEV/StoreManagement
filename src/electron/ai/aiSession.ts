import { AsyncLocalStorage } from "node:async_hooks";
import { accessFromUser, type AiAccess } from "./aiAccess";
import type { LastStoreQuery } from "./storeQueryMemory";

export type SessionChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WorkStatus = {
  phase: "thinking" | "tool" | "writing";
  toolName?: string;
};

export class AiCancelledError extends Error {
  readonly code = "AI_CANCELLED" as const;

  constructor() {
    super("AI request cancelled");
    this.name = "AiCancelledError";
  }
}

export function isAiCancelledError(error: unknown): boolean {
  return (
    error instanceof AiCancelledError ||
    (error instanceof Error && error.name === "AiCancelledError")
  );
}

export type AiSession = {
  webContentsId: number;
  conversationHistory: SessionChatMessage[];
  currentUserName?: string;
  currentUserId?: string;
  selectedModelId?: string;
  webSearchEnabled?: boolean;
  lastStoreQuery: LastStoreQuery | null;
  reuseLastQuery: boolean;
  lastLatinQ: string | null;
  abortController: AbortController | null;
  access: AiAccess | null;
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
      abortController: null,
      access: null,
    };
    sessions.set(webContentsId, session);
  }
  return session;
}

export function resetSessionChat(webContentsId: number) {
  const session = getOrCreateSession(webContentsId);
  session.abortController?.abort();
  session.abortController = null;
  session.conversationHistory = [];
  session.lastStoreQuery = null;
  session.reuseLastQuery = false;
  session.lastLatinQ = null;
}

export function bindSessionUser(webContentsId: number, user: unknown) {
  const session = getOrCreateSession(webContentsId);
  resetSessionChat(webContentsId);
  session.access = accessFromUser(user);
  session.currentUserId = session.access.userId || undefined;
  session.currentUserName = session.access.username || undefined;
  console.log(
    `[AI] Login access user=${session.access.username || "none"} admin=${session.access.isAdmin} id=${session.currentUserId || "none"}`
  );
  return session.access;
}

export function clearSessionUser(webContentsId: number) {
  const session = getOrCreateSession(webContentsId);
  resetSessionChat(webContentsId);
  session.currentUserName = undefined;
  session.currentUserId = undefined;
  session.access = null;
  console.log("[AI] Cleared store access (logout)");
}

export function abortSessionChat(webContentsId: number) {
  sessions.get(webContentsId)?.abortController?.abort();
}

export function beginSessionRequest(session: AiSession) {
  session.abortController?.abort();
  session.abortController = new AbortController();
  return session.abortController;
}

export function currentAbortSignal(): AbortSignal | undefined {
  return currentSession()?.abortController?.signal;
}

export function isAiCancelled() {
  return currentAbortSignal()?.aborted === true;
}

export function throwIfAiCancelled() {
  if (isAiCancelled()) throw new AiCancelledError();
}

export function dropSession(webContentsId: number) {
  sessions.get(webContentsId)?.abortController?.abort();
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
