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
   * Calculate drop positions using USER'S CLEAN LOGIC
   * Between any two elements: "between" OR "nest under above element"
   */
  const getDiscreteDropPositions = useCallback((
    targetIndex: number,
    relativeX: number,
    targetElement: FlatXMLElement
  ): Array<{ type: 'between' | 'nested', depth: number, parentId: string | null, ancestorIds: string[], indentOffset?: number }> => {
    const indentPerLevel = 24;
    const hoveredDepth = Math.max(0, Math.floor(relativeX / indentPerLevel));
    
    // Get the element above target (context for nesting decision)
    const prevElement = targetIndex > 0 ? flatElements[targetIndex - 1] : null;
    
    if (!prevElement) {
      // No previous element - only "between" option at target's level
      return [{
        type: 'between' as const,
        depth: targetElement.depth,
        parentId: targetElement.parentId,
        ancestorIds: [...targetElement.ancestorIds]
      }];
    }
    
    // USER'S SMART RULES based on depth relationships:
    
    if (prevElement.depth < targetElement.depth) {
      // Case: Lower depth → Higher depth (e.g., section → paragraph)
      // Only nesting makes sense - it would get nested anyway
      return [{
        type: 'nested' as const,
        depth: prevElement.depth + 1,
        parentId: prevElement.id,
        ancestorIds: [...prevElement.ancestorIds, prevElement.id],
        indentOffset: indentPerLevel // Indented line to show nesting
      }];
      
    } else if (prevElement.depth > targetElement.depth) {
      // Case: Higher depth → Lower depth (e.g., paragraph → section)  
      // Two options: stay at top level OR drop to bottom level
      
      const option1 = {
        type: 'between' as const,
        depth: prevElement.depth,
        parentId: prevElement.parentId,
        ancestorIds: [...prevElement.ancestorIds]
      };
      
      const option2 = {
        type: 'between' as const,
        depth: targetElement.depth,
        parentId: targetElement.parentId,
        ancestorIds: [...targetElement.ancestorIds]
      };
      
      // Use cursor X to choose between options
      return hoveredDepth >= prevElement.depth ? [option1] : [option2];
      
    } else {
      // Case: Same depth (e.g., section → section)
      // Both options available: place between OR nest under above
      
      if (hoveredDepth > targetElement.depth) {
        // Cursor indented right → nest under above element
        return [{
          type: 'nested' as const,
          depth: prevElement.depth + 1,
          parentId: prevElement.id,
          ancestorIds: [...prevElement.ancestorIds, prevElement.id],
          indentOffset: indentPerLevel // Indented line to show nesting
        }];
      } else {
        // Cursor at same level → place between elements
        return [{
          type: 'between' as const,
          depth: targetElement.depth,
          parentId: targetElement.parentId,
          ancestorIds: [...targetElement.ancestorIds]
        }];
      }
    }
  }, [flatElements]);

  /**
   * Calculate drop position - SIMPLIFIED UI with consistent line styling
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
    
    // Get the clean structural position using user's logic
    const positions = getDiscreteDropPositions(elementIndex, relativeX, flatElement);
    
    if (positions.length === 0) return null;
    
    const position = positions[0];
    
    // CONSISTENT Y POSITIONING: always at element top edge for clean appearance
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
      // Store the exact parent info for accurate dropping
      parentId: position.parentId,
      ancestorIds: position.ancestorIds,
      // Store indent offset for nested line styling
      indentOffset: position.indentOffset || 0
    };
    
    console.log('✅ Clean drop position:', {
      type: position.type,
      depth: position.depth,
      indented: position.indentOffset ? true : false,
      parentId: position.parentId
    });
    
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
      // Insert after the last child of target element
      insertIndex = findLastChildIndex(flatElements, targetId) + 1;
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
  
  // Insert the moved elements at the calculated position
  result.splice(insertIndex, 0, ...updatedElementsToMove);
  
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
 */
function findLastChildIndex(flatElements: FlatXMLElement[], parentId: string): number {
  let lastChildIndex = flatElements.findIndex(el => el.id === parentId);
  
  for (let i = lastChildIndex + 1; i < flatElements.length; i++) {
    if (flatElements[i].ancestorIds.includes(parentId)) {
      lastChildIndex = i;
    } else {
      break;
    }
  }
  
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