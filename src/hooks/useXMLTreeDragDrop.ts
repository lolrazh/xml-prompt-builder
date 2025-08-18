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
  type: 'before' | 'after' | 'child';
  targetId: string;
  depth: number;
  position: {
    x: number;
    y: number;
    width: number;
  };
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
   * Calculate drop position based on mouse coordinates and target element
   */
  const calculateDropPosition = useCallback((
    clientY: number,
    clientX: number,
    targetElement: Element,
    targetId: string
  ): DropIndicatorState | null => {
    const rect = targetElement.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / rect.height;
    const flatElement = flatElements.find(el => el.id === targetId);
    
    console.log('🎯 calculateDropPosition:', { 
      targetId, 
      clientY, 
      clientX, 
      relativeY: relativeY.toFixed(2),
      rectTop: rect.top,
      rectBottom: rect.bottom,
      elementDepth: flatElement?.depth 
    });
    
    if (!flatElement) return null;
    
    // Check for edge cases - top/bottom of container
    const elementIndex = flatElements.findIndex(el => el.id === targetId);
    const isFirstElement = elementIndex === 0;
    const isLastElement = elementIndex === flatElements.length - 1;
    
    // ISSUE 1 FIX: Top edge of first element = drop at absolute top
    if (isFirstElement && relativeY < 0.1) {
      return {
        type: 'before',
        targetId,
        depth: 0, // Always root level for container edges
        position: {
          x: rect.left,
          y: rect.top - 2, // Slightly above the element
          width: rect.width
        }
      };
    }
    
    // ISSUE 1 FIX: Bottom edge of last element = drop at absolute bottom  
    if (isLastElement && relativeY > 0.9) {
      return {
        type: 'after',
        targetId,
        depth: 0, // Always root level for container edges
        position: {
          x: rect.left,
          y: rect.bottom + 2, // Slightly below the element
          width: rect.width
        }
      };
    }
    
    // ISSUE 2 FIX: Horizontal cursor detection for hierarchy choice
    // Calculate which depth level the cursor is hovering over
    const baseIndent = 12; // Base left padding
    const indentPerLevel = 24; // 24px per depth level  
    const relativeX = clientX - rect.left - baseIndent;
    const hoveredDepth = Math.max(0, Math.floor(relativeX / indentPerLevel));
    
    // Regular drop detection
    let type: 'before' | 'after' | 'child';
    let depth = flatElement.depth;
    
    if (relativeY < 0.25) {
      // Top quarter - drop before element
      type = 'before';
      // ISSUE 2: Allow depth choice when dropping between elements
      depth = Math.min(hoveredDepth, flatElement.depth);
    } else if (relativeY > 0.75) {
      // Bottom quarter - drop after element  
      type = 'after';
      // ISSUE 2: Allow depth choice when dropping between elements
      depth = Math.min(hoveredDepth, flatElement.depth);
    } else {
      // Middle area - drop as child or same level based on X position
      if (hoveredDepth > flatElement.depth) {
        type = 'child';
        depth = flatElement.depth + 1;
      } else {
        type = 'before'; // Default to before if not clearly child
        depth = Math.min(hoveredDepth, flatElement.depth);
      }
    }
    
    const result = {
      type,
      targetId,
      depth,
      position: {
        x: rect.left,
        y: type === 'before' ? rect.top : 
           type === 'after' ? rect.bottom :
           rect.top + rect.height * 0.5,
        width: rect.width
      }
    };
    
    console.log('✅ Drop position result:', result);
    return result;
  }, [flatElements]);
  
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
    const { active, over } = event;
    
    console.log('🚨 DragOverEvent inspection:', {
      hasActivatorEvent: !!event.activatorEvent,
      activatorCoords: event.activatorEvent ? { x: event.activatorEvent.clientX, y: event.activatorEvent.clientY } : null,
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
    const currentY = event.activatorEvent.clientY + (event.delta?.y || 0);
    const currentX = event.activatorEvent.clientX + (event.delta?.x || 0);
    
    console.log('📍 Current cursor calc:', {
      activatorY: event.activatorEvent.clientY,
      deltaY: event.delta?.y,
      currentY,
      activatorX: event.activatorEvent.clientX,
      deltaX: event.delta?.x,
      currentX
    });
    
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
    
    // Determine drop type from final indicator state
    const finalDropType = dropIndicator?.type || 'after';
    
    try {
      // Calculate new position
      const newPosition = calculateNewPosition(flatElements, draggedId, targetId, finalDropType);
      
      // ISSUE 2 FIX: Override depth if drop indicator has custom depth
      if (dropIndicator?.depth !== undefined) {
        newPosition.newDepth = dropIndicator.depth;
        
        // Update parent relationships for custom depth
        if (newPosition.newDepth === 0) {
          newPosition.newParentId = null;
          newPosition.newAncestorIds = [];
        } else {
          // Find the appropriate parent at the new depth level
          const targetElement = flatElements.find(el => el.id === targetId);
          if (targetElement && targetElement.ancestorIds.length >= newPosition.newDepth) {
            newPosition.newParentId = targetElement.ancestorIds[newPosition.newDepth - 1] || null;
            newPosition.newAncestorIds = targetElement.ancestorIds.slice(0, newPosition.newDepth);
          }
        }
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
  
  // Update the moved elements with new position data
  const depthDifference = newPosition.newDepth - draggedElement.depth;
  const updatedElementsToMove = elementsToMove.map(element => ({
    ...element,
    depth: element.depth + depthDifference,
    parentId: element.id === draggedId ? newPosition.newParentId : element.parentId,
    ancestorIds: element.id === draggedId 
      ? newPosition.newAncestorIds 
      : element.ancestorIds.map(ancestorId => 
          ancestorId === draggedId ? newPosition.newParentId : ancestorId
        ).filter(Boolean)
  }));
  
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