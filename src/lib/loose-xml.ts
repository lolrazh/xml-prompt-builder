// src/lib/loose-xml.ts
import type { XMLElement } from "@/components/PromptBuilder";

export function looseParseXML(xml: string): XMLElement[] {
  const out: XMLElement[] = [];
  let i = 0;

  const peek = (n = 0) => xml[i + n];
  const atEof = () => i >= xml.length;

  const readName = () => {
    const start = i;
    while (!atEof() && /[A-Za-z0-9._-]/.test(peek())) i++;
    return xml.slice(start, i);
  };

  const findClosing = (name: string, from: number) => {
    const needle = `</${name}>`;
    return xml.indexOf(needle, from);
  };

  const parseNode = (): XMLElement | null => {
    // skip whitespace & noise
    while (!atEof() && /\s/.test(peek())) i++;
    if (peek() !== "<" || peek(1) === "/") return null;

    i++;                             // consume '<'
    const tag = readName();
    while (!atEof() && /\s/.test(peek())) i++; // ignore spaces inside <tag  >
    if (peek() !== ">") throw new Error(`Malformed tag <${tag}>`);
    i++;                             // consume '>'

    const bodyStart = i;
    const closePos = findClosing(tag, bodyStart);
    if (closePos === -1) throw new Error(`Missing </${tag}>`);

    // Look for potential child at current depth
    const children: XMLElement[] = [];
    let contentSegments: string[] = [];
    let cursor = bodyStart;

    while (true) {
      const nextOpen = xml.indexOf("<", cursor);
      if (nextOpen === -1 || nextOpen >= closePos) break;

      // push text up to next '<'
      contentSegments.push(xml.slice(cursor, nextOpen));
      let j = nextOpen + 1;
      if (xml[j] === "/") { cursor = j; continue; } // skip </...

      // read possible child name
      let childName = "";
      while (/[A-Za-z0-9._-]/.test(xml[j])) childName += xml[j++];
      if (!childName || xml[j] !== ">") { cursor = nextOpen + 1; continue; }

      const childClose = findClosing(childName, j + 1);
      if (childClose !== -1 && childClose < closePos) {
        // we indeed have a well-formed child
        const inner = xml.slice(nextOpen, childClose + childName.length + 3); // include </name>
        children.push(...looseParseXML(inner));
        cursor = childClose + childName.length + 3;
      } else {
        // treat '<something>' as plain text
        cursor = nextOpen + 1;
      }
    }

    // push remaining text
    contentSegments.push(xml.slice(cursor, closePos));
    i = closePos + tag.length + 3;   // jump past </tag>

    return {
      id: `element-${crypto.randomUUID()}`,
      tagName: tag,
      content: children.length ? "" : contentSegments.join(""),
      children,
    };
  };

  while (!atEof()) {
    const node = parseNode();
    if (node) out.push(node);
    else i++;
  }
  return out;
} 