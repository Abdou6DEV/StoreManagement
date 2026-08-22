export const AI_CHAT_CLOSE_EVENT = "ai-chat-close";

export function closeAiChat() {
  window.dispatchEvent(new CustomEvent(AI_CHAT_CLOSE_EVENT));
}
