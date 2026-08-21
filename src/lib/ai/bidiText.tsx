import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type BidiDir = "ltr" | "rtl";

const SKIP_TAGS = new Set(["bdi", "code", "pre", "svg"]);

export function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * Paragraph direction from the first strong character (Unicode P2/P3).
 * Majority counting flipped product list rows that start with a Latin
 * label then Arabic units — logical copy order looked fine, display reversed.
 */
export function detectTextDir(text: string): BidiDir | undefined {
  for (const ch of text) {
    if (/\p{Script=Arabic}/u.test(ch)) return "rtl";
    if (/\p{Script=Latin}/u.test(ch)) return "ltr";
  }
  // Digits / punctuation only — treat as LTR so amounts stay stable.
  if (/[0-9]/.test(text)) return "ltr";
  return undefined;
}

const LRM = "\u200E";

/** Western digits, dates, and DA amounts — always LTR, never reversed. */
const NUMBER_RUN_SOURCE =
  String.raw`[0-9][0-9\s\u00A0\u202F.,:\-/]*(?:\s*(?:DA|DZD|%))?`;
/** Latin names / barcodes inside an RTL sentence (may include digits: S23). */
const LATIN_RUN_SOURCE =
  String.raw`[\p{Script=Latin}][\p{Script=Latin}0-9]*` +
  String.raw`(?:[\s.\-'/]+[\p{Script=Latin}0-9]+)*`;
const LTR_RUN_SOURCE = `(?:${NUMBER_RUN_SOURCE})|(?:${LATIN_RUN_SOURCE})`;
/** Arabic inside an LTR sentence. */
const RTL_RUN_SOURCE = String.raw`\p{Script=Arabic}+(?:\s+\p{Script=Arabic}+)*`;

function isolateChunk(text: string, dir: BidiDir, id: string) {
  return (
    <span key={id} dir={dir} className="[unicode-bidi:isolate]">
      {dir === "ltr" ? LRM : null}
      {text}
    </span>
  );
}

function isolateText(
  text: string,
  baseDir: BidiDir,
  keyPrefix: number,
): ReactNode[] {
  const pattern = new RegExp(
    baseDir === "rtl" ? LTR_RUN_SOURCE : RTL_RUN_SOURCE,
    baseDir === "rtl" ? "giu" : "gu",
  );
  const isolateDir = baseDir === "rtl" ? "ltr" : "rtl";
  const parts: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(isolateChunk(match[0], isolateDir, `${keyPrefix}-${n}`));
    n += 1;
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

export function isolateMixedBidi(
  children: ReactNode,
  parentDir?: BidiDir,
): ReactNode {
  const dir = parentDir ?? detectTextDir(collectText(children));
  if (!dir) return children;

  return Children.map(children, (child, index) => {
    if (child == null || typeof child === "boolean") return child;
    if (typeof child === "string" || typeof child === "number") {
      return isolateText(String(child), dir, index);
    }
    if (!isValidElement(child)) return child;
    const type = typeof child.type === "string" ? child.type : "";
    if (SKIP_TAGS.has(type)) return child;
    if (type === "span" && (child.props as { dir?: string }).dir === "ltr") {
      return child;
    }
    const nested = (child.props as { children?: ReactNode }).children;
    if (nested == null) return child;
    return cloneElement(child, undefined, isolateMixedBidi(nested, dir));
  });
}

type BidiTextProps = {
  children: ReactNode;
  className?: string;
  /** Fill the parent so RTL lines stay left-aligned like LTR messages. */
  block?: boolean;
};

export function BidiText({ children, className, block = false }: BidiTextProps) {
  const dir = detectTextDir(collectText(children));
  const isolated = isolateMixedBidi(children, dir);

  // Neutral / empty: no embedding. LTR must still set dir+isolate so EN/FR
  // copy does not inherit an Arabic page direction (trailing punctuation flip).
  if (!dir) {
    return <span className={className}>{isolated}</span>;
  }

  return (
    <span
      dir={dir}
      className={cn(
        "[unicode-bidi:isolate]",
        block && "inline-block w-full",
        block && dir === "rtl" && "text-left",
        className,
      )}
    >
      {isolated}
    </span>
  );
}
