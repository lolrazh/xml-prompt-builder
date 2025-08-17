// src/lib/loose-xml.ts
import type { XMLElement } from "@/components/PromptBuilder";

/**
 * Ultra-tolerant “XML-ish” parser.
 *  • Creates a child node ONLY when <name> … </name> exists at the same depth.
 *  • Leaves every other angle-bracket sequence untouched inside parent.content.
 */
export function looseParseXML(xml: string): XMLElement[] {
  let i = 0;
  const len = xml.length;
  const out: XMLElement[] = [];

  /** true if we’ve hit the end of input */
  const eof = () => i >= len;

  /** peek a character without consuming */
  const peek = (n = 0) => (i + n < len ? xml[i + n] : "");

  /** advance & return current char */
  const next = () => xml[i++];

  /** skip whitespace */
  const skipWS = () => {
    while (!eof() && /\s/.test(peek())) i++;
  };

  /** read tag-name (letters, digits, dot, dash, underscore) */
  const readName = () => {
    const start = i;
    while (!eof() && /[A-Za-z0-9._-]/.test(peek())) i++;
    return xml.slice(start, i);
  };

  /**
   * Find the position of the matching </name> FOR THIS DEPTH ONLY.
   * Returns -1 if not found before limit.
   */
  const findClose = (name: string, from: number, limit: number): number => {
    const open = `<${name}>`;
    const close = `</${name}>`;
    let depth = 0;
    let p = from;
    while (p < limit) {
      const openPos = xml.indexOf(open, p);
      const closePos = xml.indexOf(close, p);
      if (closePos === -1) return -1;           // no close at all
      if (openPos !== -1 && openPos < closePos) {
        depth++;
        p = openPos + open.length;
        continue;
      }
      if (depth === 0) return closePos;         // this is the real match
      depth--;
      p = closePos + close.length;
    }
    return -1;
  };

  /**
   * Core recursive routine: parse the next node starting at the current i.
   * Returns null when no tag is found (caller will advance i manually).
   */
  const parseNode = (): XMLElement | null => {
    skipWS();
    if (peek() !== "<" || peek(1) === "/") return null;  // not an opening tag

    const startTagPos = i;   // remember in case we bail out
    next();                  // consume '<'
    const tag = readName();
    if (!tag) {
      i = startTagPos + 1;   // treat '<' as plain char
      return null;
    }

    // skip to end of the opening tag '>'
    while (!eof() && peek() !== ">") next();
    if (eof()) return null;  // malformed; treat as plain text outside
    next();                  // consume '>'

    const contentStart = i;
    const closePos = findClose(tag, contentStart, len);
    if (closePos === -1) {
      // unmatched <tag> – revert: leave whole thing as plain text
      i = startTagPos;                   // rewind
      return null;
    }

    const children: XMLElement[] = [];
    let segs: string[] = [];
    let cursor = contentStart;

    while (true) {
      const nextLt = xml.indexOf("<", cursor);
      if (nextLt === -1 || nextLt >= closePos) break;

      // push text before '<'
      segs.push(xml.slice(cursor, nextLt));

      // Attempt to parse child
      i = nextLt;
      const child = parseNode();
      if (child) {
        children.push(child);
        cursor = i;        // parseNode left i after child's </name>
      } else {
        // Not a real child – keep '<' verbatim
        const gt = xml.indexOf(">", nextLt);
        const end = gt === -1 || gt >= closePos ? closePos : gt + 1;
        segs.push(xml.slice(nextLt, end));
        cursor = end;
      }
    }

    // push remaining tail text
    segs.push(xml.slice(cursor, closePos));

    // move i right past </tag>
    i = closePos + tag.length + 3;  // 3 = "</>".length

    return {
      id: `element-${crypto.randomUUID()}`,
      tagName: tag,
      content: children.length ? "" : segs.join("").trim(),
      children,
      isVisible: true,
    };
  };

  /** Main driver loop */
  while (!eof()) {
    const mark = i;
    const node = parseNode();
    if (node) {
      out.push(node);
    } else {
      // plain char – advance & merge consecutive text later
      i = mark + 1;
    }
  }

  return out;
} 