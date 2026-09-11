export function getAppScrollY(): number {
  return window.scrollY;
}

export function getAppClientHeight(): number {
  return window.innerHeight;
}

export function getAppScrollHeight(): number {
  return document.documentElement.scrollHeight;
}

export function scrollAppTo(top: number, behavior: ScrollBehavior = "auto") {
  window.scrollTo({ top, behavior });
}

export function getAppElementScrollTop(element: Element): number {
  return window.scrollY + element.getBoundingClientRect().top;
}

export function subscribeAppScroll(onScroll: () => void): () => void {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
