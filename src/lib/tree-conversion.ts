// Tree Conversion Utilities - Pure, Elegant, Satisfying
// Convert between nested XML tree and flat array structures

import type { XMLElement } from '@/components/PromptBuilder';

// Enhanced flat structure with all the metadata we need
export interface FlatXMLElement {
  id: string;
  tagName: string;
  content: string;
  depth: number;
  parentId: string | null;
  ancestorIds: string[];
  order: number; // Position within parent's children
  collapsed?: boolean;
  isVisible?: boolean;
  hasChildren?: boolean; // Whether this element currently has children
}

/**
 * Convert nested tree structure to flat array
 * Each element remembers its place in the hierarchy
 */
export function treeToFlat(elements: XMLElement[]): FlatXMLElement[] {
  const result: FlatXMLElement[] = [];
  
  function traverse(
    items: XMLElement[], 
    depth = 0, 
    parentId: string | null = null,
    ancestorIds: string[] = []
  ): void {
    items.forEach((item, order) => {
      // Create flat representation of this element
      const flatElement: FlatXMLElement = {
        id: item.id,
        tagName: item.tagName,
        content: item.content,
        depth,
        parentId,
        ancestorIds: [...ancestorIds], // Copy array for immutability
        order,
        collapsed: item.collapsed,
        isVisible: item.isVisible,
        hasChildren: item.children && item.children.length > 0
      };
      
      result.push(flatElement);
      
      // Recursively process children ALWAYS (we will hide them in UI when collapsed)
      if (item.children && item.children.length > 0) {
        traverse(
          item.children, 
          depth + 1, 
          item.id,
          [...ancestorIds, item.id]
        );
      }
    });
  }
  
  traverse(elements);
  return result;
}

/**
 * Convert flat array back to nested tree structure
 * Perfectly reconstructs the original hierarchy
 */
export function flatToTree(flatElements: FlatXMLElement[]): XMLElement[] {
  // Group elements by their parent ID
  const elementMap = new Map<string, FlatXMLElement>();
  const childrenMap = new Map<string | null, FlatXMLElement[]>();
  
  // Build lookup maps for efficient reconstruction
  flatElements.forEach(element => {
    elementMap.set(element.id, element);
    
    const siblings = childrenMap.get(element.parentId) || [];
    siblings.push(element);
    childrenMap.set(element.parentId, siblings);
  });
  
  // Sort children arrays by their order property
  childrenMap.forEach(children => {
    children.sort((a, b) => a.order - b.order);
  });
  
  // Recursive function to build tree from flat elements
  function buildSubtree(parentId: string | null): XMLElement[] {
    const children = childrenMap.get(parentId) || [];
    
    return children.map(flatElement => ({
      id: flatElement.id,
      tagName: flatElement.tagName,
      content: flatElement.content,
      collapsed: flatElement.collapsed,
      isVisible: flatElement.isVisible,
      children: buildSubtree(flatElement.id) // Recursively build children
    }));
  }
  
  // Start with root elements (parentId === null)
  return buildSubtree(null);
}

/**
 * Validate that an element can be moved to a new position
 * Prevents circular dependencies and invalid operations
 */
export function canMoveElement(
  flatElements: FlatXMLElement[],
  draggedId: string,
  targetId: string
): boolean {
  const draggedElement = flatElements.find(el => el.id === draggedId);
  const targetElement = flatElements.find(el => el.id === targetId);
  
  if (!draggedElement || !targetElement) {
    return false;
  }
  
  // Can't move element to be its own child (circular dependency)
  if (targetElement.ancestorIds.includes(draggedId)) {
    return false;
  }
  
  // Can't move element to itself
  if (draggedId === targetId) {
    return false;
  }
  
  return true;
}

/**
 * Calculate the new position for an element after a move operation
 */
export function calculateNewPosition(
  flatElements: FlatXMLElement[],
  draggedId: string,
  targetId: string,
  dropType: 'before' | 'after' | 'child'
): { newDepth: number; newParentId: string | null; newAncestorIds: string[] } {
  const targetElement = flatElements.find(el => el.id === targetId);
  
  if (!targetElement) {
    throw new Error(`Target element ${targetId} not found`);
  }
  
  switch (dropType) {
    case 'before':
    case 'after':
      // Same level as target (sibling)
      return {
        newDepth: targetElement.depth,
        newParentId: targetElement.parentId,
        newAncestorIds: [...targetElement.ancestorIds]
      };
      
    case 'child':
      // One level deeper (child of target)
      return {
        newDepth: targetElement.depth + 1,
        newParentId: targetElement.id,
        newAncestorIds: [...targetElement.ancestorIds, targetElement.id]
      };
      
    default:
      throw new Error(`Invalid drop type: ${dropType}`);
  }
}

/**
 * Helper function to find an element by ID in flat array
 */
export function findElementById(
  flatElements: FlatXMLElement[],
  id: string
): FlatXMLElement | undefined {
  return flatElements.find(element => element.id === id);
}

/**
 * Helper function to get all children of an element (direct and nested)
 */
export function getAllDescendants(
  flatElements: FlatXMLElement[],
  parentId: string
): FlatXMLElement[] {
  return flatElements.filter(element => 
    element.ancestorIds.includes(parentId)
  );
}

/**
 * Helper function to get direct children of an element
 */
export function getDirectChildren(
  flatElements: FlatXMLElement[],
  parentId: string | null
): FlatXMLElement[] {
  return flatElements
    .filter(element => element.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Debug helper - visualize the flat structure nicely
 */
export function visualizeFlat(flatElements: FlatXMLElement[]): string {
  return flatElements.map(element => {
    const indent = '  '.repeat(element.depth);
    const parentInfo = element.parentId ? ` (parent: ${element.parentId})` : ' (root)';
    return `${indent}<${element.tagName}>${parentInfo}`;
  }).join('\n');
}
