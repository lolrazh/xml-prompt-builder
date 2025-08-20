// XML Tree Drag & Drop Hook - The Brain of Our Drag System
// Clean, predictable, and absolutely rock-solid

import { useState, useCallback, useMemo } from 'react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { 
  treeToFlat, 
  flatToTree, 
  canMoveElement, 
  calculateNewPosition,
  type FlatXMLElement 
} from '@/lib/tree-conversion';
import type { XMLElement } from '@/components/PromptBuilder';

// Drop indicator state - shows where element will be placed
export interface DropIndicatorState {
  type: 'between' | 'nested';
  targetId: string;
  depth: number;
  position: {
    x: number;
    y: number;
    width: number;
  };
  // Store exact parent relationship for accurate dropping
  parentId?: string | null;
  ancestorIds?: string[];
  // For styling: indented nested lines
  indentOffset?: number;
}

// Main hook return type - everything you need for drag operations
export interface UseXMLTreeDragDropReturn {
  // Current drag state
  activeId: string | null;
  draggedElement: FlatXMLElement | null;
  dropIndicator: DropIndicatorState | null;
  isDragging: boolean;
  
  // Event handlers for DndContext
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Utility functions
  canDrop: (draggedId: string, targetId: string) => boolean;
  getDepthStyle: (depth: number) => React.CSSProperties;
  isValidDropTarget: (targetId: string) => boolean;
  
  // Flat data for rendering
  flatElements: FlatXMLElement[];
}

export function useXMLTreeDragDrop(
  elements: XMLElement[],
  onElementsChange: (newElements: XMLElement[]) => void
): UseXMLTreeDragDropReturn {
  
  // Convert tree to flat structure for efficient operations
  const flatElements = useMemo(() => treeToFlat(elements), [elements]);
  
  // Drag state management
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  
  // Derived state
  const draggedElement = useMemo(() => 
    activeId ? flatElements.find(el => el.id === activeId) || null : null,
    [activeId, flatElements]
  );
  
  const isDragging = activeId !== null;
  
  /**
   * Calculate drop positions using ELEGANT MATHEMATICAL SOLUTION
   * Formula: validDepths = [min(D1, D2), max(D1, D2) + 1]
   * Direct cursor-to-depth mapping with semantic parent calculation
   */
  const getDiscreteDropPositions = useCallback((
    targetIndex: number,
    relativeX: number,
    targetElement: FlatXMLElement
  ): Array<{ type: 'between' | 'nested', depth: number, parentId: string | null, ancestorIds: string[], indentOffset?: number }> => {
    const indentPerLevel = 24;
    const hoveredDepth = Math.max(0, Math.floor(relativeX / indentPerLevel));
    
    const prevElement = targetIndex > 0 ? flatElements[targetIndex - 1] : null;
    
    if (!prevElement) {
      // Simple case: no previous element - allow current depth or nesting
      const maxAllowedDepth = targetElement.depth + 1;
      const selectedDepth = Math.min(hoveredDepth, maxAllowedDepth);
      
      if (selectedDepth === targetElement.depth + 1) {
        // Nesting into target
        return [{
          type: 'nested' as const,
          depth: selectedDepth,
          parentId: targetElement.id,
          ancestorIds: [...targetElement.ancestorIds, targetElement.id],
          indentOffset: indentPerLevel
        }];
      } else {
        // Same level as target
        return [{
          type: 'between' as const,
          depth: targetElement.depth,
          parentId: targetElement.parentId,
          ancestorIds: [...targetElement.ancestorIds]
        }];
      }
    }
    
    // MATHEMATICAL FOUNDATION: Calculate valid depth range
    const D1 = prevElement.depth;
    const D2 = targetElement.depth;
    const minDepth = Math.min(D1, D2);
    const maxDepth = Math.max(D1, D2) + 1;
    
    // DIRECT MAPPING: Cursor position to depth (clamped to valid range)
    const selectedDepth = Math.max(minDepth, Math.min(hoveredDepth, maxDepth));
    
    // SEMANTIC PARENT CALCULATION: Find parent based on depth meaning
    const parentInfo = findParentForDepth(selectedDepth, prevElement, targetElement);
    
    console.log('🎯 Elegant drop calculation:', {
      formula: `[min(${D1},${D2}), max(${D1},${D2})+1] = [${minDepth}, ${maxDepth}]`,
      cursor: hoveredDepth,
      selected: selectedDepth,
      parent: parentInfo.parentId
    });
    
    return [{
      type: parentInfo.isNested ? 'nested' as const : 'between' as const,
      depth: selectedDepth,
      parentId: parentInfo.parentId,
      ancestorIds: parentInfo.ancestorIds,
      indentOffset: parentInfo.isNested ? indentPerLevel : 0
    }];
  }, [flatElements]);

  /**
   * Find parent for a given depth using semantic logic
   */
  const findParentForDepth = useCallback((
    selectedDepth: number,
    prevElement: FlatXMLElement,
    targetElement: FlatXMLElement
  ): { parentId: string | null; ancestorIds: string[]; isNested: boolean } => {
    
    if (selectedDepth === 0) {
      return { parentId: null, ancestorIds: [], isNested: false };
    }
    
    const parentDepth = selectedDepth - 1;
    
    // Check if we're nesting into one of the adjacent elements
    if (prevElement.depth === parentDepth) {
      return {
        parentId: prevElement.id,
        ancestorIds: [...prevElement.ancestorIds, prevElement.id],
        isNested: true
      };
    }
    
    if (targetElement.depth === parentDepth) {
      return {
        parentId: targetElement.id,
        ancestorIds: [...targetElement.ancestorIds, targetElement.id],
        isNested: true
      };
    }
    
    // Look for parent in ancestry chains (sibling relationship)
    if (prevElement.ancestorIds.length > parentDepth) {
      const parentId = prevElement.ancestorIds[parentDepth];
      return {
        parentId,
        ancestorIds: prevElement.ancestorIds.slice(0, selectedDepth),
        isNested: false
      };
    }
    
    if (targetElement.ancestorIds.length > parentDepth) {
      const parentId = targetElement.ancestorIds[parentDepth];
      return {
        parentId,
        ancestorIds: targetElement.ancestorIds.slice(0, selectedDepth),
        isNested: false
      };
    }
    
    // Fallback - shouldn't happen with valid tree structure
    return { parentId: null, ancestorIds: [], isNested: false };
  }, []);

  /**
   * Calculate drop position using ELEGANT MATHEMATICAL SOLUTION
   */
  const calculateDropPosition = useCallback((
    clientY: number,
    clientX: number,
    targetElement: Element,
    targetId: string
  ): DropIndicatorState | null => {
    const rect = targetElement.getBoundingClientRect();
    const flatElement = flatElements.find(el => el.id === targetId);
    
    if (!flatElement) return null;
    
    const elementIndex = flatElements.findIndex(el => el.id === targetId);
    const relativeX = clientX - rect.left - 12; // 12px base padding
    
    // Use elegant direct mapping to get position
    const positions = getDiscreteDropPositions(elementIndex, relativeX, flatElement);
    
    if (positions.length === 0) return null;
    
    const position = positions[0];
    
    // Consistent Y positioning at element boundary
    const yPosition = rect.top;
    
    const result = {
      type: position.type,
      targetId,
      depth: position.depth,
      position: {
        x: rect.left,
        y: yPosition,
        width: rect.width
      },
      // Store exact parent info for accurate dropping
      parentId: position.parentId,
      ancestorIds: position.ancestorIds,
      // Store indent offset for visual styling
      indentOffset: position.indentOffset || 0
    };
    
    return result;
  }, [flatElements, getDiscreteDropPositions]);
  
  /**
   * Check if element can be dropped at target
   */
  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    return canMoveElement(flatElements, draggedId, targetId);
  }, [flatElements]);
  
  /**
   * Check if target is a valid drop location
   */
  const isValidDropTarget = useCallback((targetId: string): boolean => {
    if (!activeId) return false;
    return canDrop(activeId, targetId);
  }, [activeId, canDrop]);
  
  /**
   * Generate CSS styles for depth-based indentation
   */
  const getDepthStyle = useCallback((depth: number): React.CSSProperties => ({
    '--depth': depth,
    paddingLeft: `calc(${depth} * 1.5rem)`,
    position: 'relative'
  } as React.CSSProperties), []);
  
  /**
   * Handle drag start - initialize drag state
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setDropIndicator(null);
    
    console.log('🎯 Drag started:', active.id);
  }, []);
  
  /**
   * Handle drag over - update drop indicator position
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    console.log('🚨 DragOverEvent inspection:', {
      hasActivatorEvent: !!event.activatorEvent,
      activatorCoords: event.activatorEvent ? { 
        x: (event.activatorEvent as MouseEvent).clientX, 
        y: (event.activatorEvent as MouseEvent).clientY 
      } : null,
      hasDelta: !!event.delta,
      delta: event.delta,
      allEventKeys: Object.keys(event)
    });
    
    if (!over || !activeId) {
      setDropIndicator(null);
      return;
    }
    
    const targetId = over.id as string;
    
    // Don't show indicator when dragging over self
    if (targetId === activeId) {
      setDropIndicator(null);
      return;
    }
    
    // Validate drop target
    if (!isValidDropTarget(targetId)) {
      setDropIndicator(null);
      return;
    }
    
    // Get target element from DOM
    const targetElement = document.querySelector(`[data-tree-item="${targetId}"]`);
    if (!targetElement) {
      setDropIndicator(null);
      return;
    }
    
    // CRITICAL FIX: Calculate current cursor position, not initial drag position!
    const currentY = (event.activatorEvent as MouseEvent).clientY + (event.delta?.y || 0);
    const currentX = (event.activatorEvent as MouseEvent).clientX + (event.delta?.x || 0);
    
    
    // Calculate and set drop indicator
    const indicator = calculateDropPosition(
      currentY,
      currentX, 
      targetElement, 
      targetId
    );
    
    setDropIndicator(indicator);
  }, [activeId, isValidDropTarget, calculateDropPosition]);
  
  /**
   * Handle drag end - execute the move operation
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear drag state
    setActiveId(null);
    setDropIndicator(null);
    
    // Validate drop
    if (!over || !active || active.id === over.id) {
      console.log('🚫 Invalid drop - no change');
      return;
    }
    
    const draggedId = active.id as string;
    const targetId = over.id as string;
    
    // Final validation
    if (!canDrop(draggedId, targetId)) {
      console.log('🚫 Drop not allowed - circular dependency or invalid target');
      return;
    }
    
    // Map new drop types to the expected format for moveElementInFlat  
    const finalDropType = dropIndicator?.type === 'nested' ? 'child' : 'before';
    
    try {
      // FIXED: Use exact position data from drop indicator instead of calculating
      let newPosition;
      
      if (dropIndicator && dropIndicator.parentId !== undefined && dropIndicator.ancestorIds !== undefined) {
        // Use the precise parent relationship from the drop indicator
        newPosition = {
          newDepth: dropIndicator.depth,
          newParentId: dropIndicator.parentId,
          newAncestorIds: dropIndicator.ancestorIds
        };
      } else {
        // Fallback to old calculation method
        newPosition = calculateNewPosition(flatElements, draggedId, targetId, finalDropType);
      }
      
      // Perform the move operation
      const updatedFlat = moveElementInFlat(flatElements, draggedId, targetId, finalDropType, newPosition);
      
      // Convert back to tree structure
      const newTreeElements = flatToTree(updatedFlat);
      
      // Update parent component
      onElementsChange(newTreeElements);
      
      console.log('✅ Move completed:', { 
        draggedId, 
        targetId, 
        type: finalDropType,
        newDepth: newPosition.newDepth 
      });
      
    } catch (error) {
      console.error('❌ Move operation failed:', error);
    }
  }, [flatElements, dropIndicator, canDrop, onElementsChange]);
  
  return {
    // State
    activeId,
    draggedElement,
    dropIndicator,
    isDragging,
    
    // Handlers
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    
    // Utilities
    canDrop,
    getDepthStyle,
    isValidDropTarget,
    
    // Data
    flatElements
  };
}

/**
 * Core function to move element in flat array
 * This is where the magic happens! ✨
 */
function moveElementInFlat(
  flatElements: FlatXMLElement[],
  draggedId: string,
  targetId: string,
  dropType: 'before' | 'after' | 'child',
  newPosition: { newDepth: number; newParentId: string | null; newAncestorIds: string[] }
): FlatXMLElement[] {
  
  // Find the dragged element and target element IN THE ORIGINAL ARRAY
  const draggedIndex = flatElements.findIndex(el => el.id === draggedId);
  const originalTargetIndex = flatElements.findIndex(el => el.id === targetId);
  
  if (draggedIndex === -1 || originalTargetIndex === -1) {
    throw new Error('Element not found in flat array');
  }
  
  const draggedElement = flatElements[draggedIndex];
  
  // CALCULATE INSERTION INDEX BEFORE REMOVING ANYTHING
  let insertIndex: number;
  switch (dropType) {
    case 'before':
      insertIndex = originalTargetIndex;
      break;
    case 'after':
      insertIndex = originalTargetIndex + 1;
      break;
    case 'child':
      // FIXED: Insert after the last child of target element
      const lastChildIndex = findLastChildIndex(flatElements, targetId);
      insertIndex = lastChildIndex + 1;
      
      // Ensure we don't exceed array bounds
      if (insertIndex > flatElements.length) {
        insertIndex = flatElements.length;
      }
      
      console.log('🎯 Child drop insertion:', {
        targetId,
        lastChildIndex,
        insertIndex,
        arrayLength: flatElements.length
      });
      break;
    default:
      throw new Error(`Invalid drop type: ${dropType}`);
  }
  
  // If we're moving an element down (to a higher index), we need to account
  // for the fact that removing it will shift the insertion point
  if (draggedIndex < insertIndex) {
    // Get count of elements we're about to remove (dragged + descendants)
    const draggedDescendants = getAllDescendantsInFlat(flatElements, draggedId);
    const elementsToRemoveCount = 1 + draggedDescendants.length;
    insertIndex -= elementsToRemoveCount;
  }
  
  // Create a copy of the flat array
  const result = [...flatElements];
  
  // Remove the dragged element (and all its descendants)
  const draggedDescendants = getAllDescendantsInFlat(result, draggedId);
  const elementsToMove = [draggedElement, ...draggedDescendants];
  
  // Remove all elements to move from their current positions (reverse order to maintain indices)
  elementsToMove.reverse().forEach(element => {
    const index = result.findIndex(el => el.id === element.id);
    if (index !== -1) {
      result.splice(index, 1);
    }
  });
  
  // FIXED: Update the moved elements with correct ancestorIds for descendants
  const depthDifference = newPosition.newDepth - draggedElement.depth;
  const updatedElementsToMove = elementsToMove.map(element => {
    if (element.id === draggedId) {
      // For the moved element itself: use the calculated new position
      return {
        ...element,
        depth: element.depth + depthDifference,
        parentId: newPosition.newParentId,
        ancestorIds: newPosition.newAncestorIds
      };
    } else {
      // For descendants: rebuild full ancestor chain
      const draggedIndex = element.ancestorIds.indexOf(draggedId);
      let newAncestorIds;
      
      if (draggedIndex !== -1) {
        // Rebuild: [new parent chain] + [moved parent] + [remaining original chain]
        newAncestorIds = [
          ...newPosition.newAncestorIds,                    // New parent's ancestor chain
          draggedId,                                        // The moved parent itself  
          ...element.ancestorIds.slice(draggedIndex + 1)    // Any ancestors below moved parent
        ];
      } else {
        // Fallback: shouldn't happen, but keep original chain
        newAncestorIds = element.ancestorIds;
      }
      
      return {
        ...element,
        depth: element.depth + depthDifference,
        parentId: element.parentId, // Parent relationship unchanged for descendants
        ancestorIds: newAncestorIds
      };
    }
  });
  
  // FIXED: Insert the moved elements with validation
  const originalLength = result.length;
  
  // Ensure insertion index is valid
  const safeInsertIndex = Math.max(0, Math.min(insertIndex, result.length));
  
  console.log('🔧 Element insertion:', {
    originalLength,
    insertIndex,
    safeInsertIndex,
    elementsToInsert: updatedElementsToMove.length
  });
  
  result.splice(safeInsertIndex, 0, ...updatedElementsToMove);
  
  // Validate the operation succeeded
  if (result.length === originalLength + updatedElementsToMove.length) {
    console.log('✅ Elements properly inserted');
  } else {
    console.error('❌ Element insertion failed!', {
      expected: originalLength + updatedElementsToMove.length,
      actual: result.length
    });
  }
  
  // Recalculate order values for all elements
  return recalculateOrderValues(result);
}

/**
 * Get all descendants of an element in flat array
 */
function getAllDescendantsInFlat(flatElements: FlatXMLElement[], parentId: string): FlatXMLElement[] {
  return flatElements.filter(element => element.ancestorIds.includes(parentId));
}

/**
 * Find the index of the last child (including nested children) of a parent
 * FIXED: Properly handles last elements with no children
 */
function findLastChildIndex(flatElements: FlatXMLElement[], parentId: string): number {
  const parentIndex = flatElements.findIndex(el => el.id === parentId);
  if (parentIndex === -1) {
    console.error('❌ Parent not found:', parentId);
    return -1;
  }
  
  let lastChildIndex = parentIndex; // Start with parent's index
  
  // Look for children AFTER the parent
  for (let i = parentIndex + 1; i < flatElements.length; i++) {
    if (flatElements[i].ancestorIds.includes(parentId)) {
      lastChildIndex = i;
    } else {
      break; // No more children of this parent
    }
  }
  
  console.log('🔍 findLastChildIndex:', {
    parentId,
    parentIndex,
    lastChildIndex,
    hasChildren: lastChildIndex > parentIndex
  });
  
  return lastChildIndex;
}

/**
 * Recalculate order values after elements have been moved
 */
function recalculateOrderValues(flatElements: FlatXMLElement[]): FlatXMLElement[] {
  // Group elements by parent
  const parentGroups = new Map<string | null, FlatXMLElement[]>();
  
  flatElements.forEach(element => {
    const siblings = parentGroups.get(element.parentId) || [];
    siblings.push(element);
    parentGroups.set(element.parentId, siblings);
  });
  
  // Update order values within each parent group
  parentGroups.forEach(siblings => {
    siblings.forEach((element, index) => {
      element.order = index;
    });
  });
  
  return flatElements;
}