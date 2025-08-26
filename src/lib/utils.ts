import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Token estimation utility function
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Simple character-based estimation: ~4 characters per token
  // This is generally more accurate for most tokenizers including GPT models
  const characterCount = text.length;
  const estimatedTokens = characterCount / 4;
  
  // Round to nearest integer
  return Math.round(estimatedTokens);
}

// Format token count for display (e.g., 1200 -> "1.2k")
export function formatTokenCount(count: number): string {
  if (count === 0) {
    return "0 tokens";
  }
  
  if (count < 1000) {
    return `${count} tokens`;
  }
  
  if (count < 10000) {
    return `${(Math.floor(count / 100) / 10)}k tokens`;
  }
  
  if (count < 100000) {
    return `${(count / 1000).toFixed(0)}k tokens`;
  }
  
  return `${(count / 1000000).toFixed(1)}M tokens`;
}

// Generate a UUID
export function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers that do not support crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate element ID using timestamp pattern (consistent with existing pattern)
export function generateElementId(): string {
  return `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Deep clone XMLElement and assign new unique IDs to all elements in the tree
export function duplicateXMLElement(element: any): any {
  const duplicateRecursive = (el: any): any => {
    const newId = generateElementId();
    return {
      ...el,
      id: newId,
      children: el.children && el.children.length > 0 ? el.children.map(duplicateRecursive) : []
    };
  };
  
  return duplicateRecursive(element);
}
