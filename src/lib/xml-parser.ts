import { XMLElement } from "@/components/PromptBuilder";

export function xmlStringToElements(xmlString: string): XMLElement[] {
  const parser = new DOMParser();
  // Wrap the string in a root element to handle fragments
  const wrappedXmlString = `<root>${xmlString.trim()}</root>`;
  const doc = parser.parseFromString(wrappedXmlString, "application/xml");

  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    // Provide a more specific error message from the parser if available
    throw new Error(`Invalid XML format: ${errorNode.textContent || ''}`);
  }

  const parseNode = (node: Element): XMLElement => {
    const children = Array.from(node.children).map(parseNode);
    
    let content = "";
    if (node.childNodes.length > 0 && !node.children.length) {
        content = node.textContent?.trim() || "";
    }


    return {
      id: `element-${crypto.randomUUID()}`,
      tagName: node.tagName,
      content: content,
      children: children,
      collapsed: false,
    };
  };

  // If the parser succeeded, doc.documentElement should be our <root> element.
  // We need to parse its children.
  if (!doc.documentElement) {
    return [];
  }

  return Array.from(doc.documentElement.children).map(parseNode);
} 