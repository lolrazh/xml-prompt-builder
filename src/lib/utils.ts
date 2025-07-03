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

  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Split into words
  const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
  
  // Count XML tags (opening and closing)
  const xmlTagCount = (normalizedText.match(/<[^>]+>/g) || []).length;
  
  // Count special characters that might be tokenized separately
  const specialCharCount = (normalizedText.match(/[{}[\]().,;:!?"'`]/g) || []).length;
  
  // Base word count with a multiplier for subword tokenization
  const baseTokens = words.length * 1.3;
  
  // XML tags typically take 1-2 tokens each depending on complexity
  const xmlTokens = xmlTagCount * 1.5;
  
  // Special characters usually take 0.5-1 tokens each
  const specialTokens = specialCharCount * 0.5;
  
  // Total estimation
  const totalTokens = baseTokens + xmlTokens + specialTokens;
  
  // Round to nearest integer
  return Math.round(totalTokens);
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
