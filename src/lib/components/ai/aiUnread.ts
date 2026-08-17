let unreadReply = false;

export function getAiUnreadReply() {
  return unreadReply;
}

export function setAiUnreadReply(unread: boolean) {
  unreadReply = unread;
}
