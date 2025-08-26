// XML Tree Drag & Drop Hook - The Brain of Our Drag System
// Clean, predictable, and absolutely rock-solid
// Now with duplication support via Option key

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { 
  treeToFlat, 
  flatToTree, 
  canMoveElement, 
  calculateNewPosition,
  type FlatXMLElement 
} from '@/lib/tree-conversion';
import { duplicateXMLElement } from '@/lib/utils';
import type { XMLElement } from '@/components/PromptBuilder';

// Drop indicator state - shows where element will be placed
export interface DropIndicatorState {
  type: 'between' | 'nested' | 'first-child';
  targetId: string;
  depth: number;
  position: {
    x: number;
    y: number;
    width: number;
    paddingLeft: number;
    paddingRight: number;
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
  isDuplicateMode: boolean; // Option key held during drag
  
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
  
  // Convert tree to flat structure (all elements, including children of collapsed nodes)
  const allFlatElements = useMemo(() => treeToFlat(elements), [elements]);

  // Compute the visible subset for rendering (hide any element whose ancestor is collapsed)
  const flatElements = useMemo(() => {
    const collapsedIds = new Set(allFlatElements.filter(el => el.collapsed).map(el => el.id));
    return allFlatElements.filter(el => !el.ancestorIds.some(aid => collapsedIds.has(aid)));
  }, [allFlatElements]);
  
  // Drag state management
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState<boolean>(false);
  
  // Derived state
  const draggedElement = useMemo(() => 
    activeId ? allFlatElements.find(el => el.id === activeId) || null : null,
    [activeId, allFlatElements]
  );
  
  const isDragging = activeId !== null;

  // Track Option key state during drag
  useEffect(() => {
    if (!isDragging) {
      setIsDuplicateMode(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) { // altKey is the Option key on Mac and Alt key on PC
        setIsDuplicateMode(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.altKey) {
        setIsDuplicateMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDragging]);
  
  /**
   * Drop Depth Rules (Previous-Item Logic)
   * - Default: match the previous (upper) element's depth/parent
   * - Exception: if the target is a direct child of the previous element,
   *   drop as the parent's first child (depth = prev.depth + 1)
   */
  const getDiscreteDropPositions = useCallback((
    targetIndex: number,
    relativeX: number,
    targetElement: FlatXMLElement
  ): Array<{ type: 'between' | 'nested' | 'first-child', depth: number, parentId: string | null, ancestorIds: string[], indentOffset?: number }> => {
    
    const prevElement = targetIndex > 0 ? flatElements[targetIndex - 1] : null;
    
    if (!prevElement) {
      // No previous element - just use target's depth and parent
      return [{
        type: 'between' as const,
        depth: targetElement.depth,
        parentId: targetElement.parentId,
        ancestorIds: [...targetElement.ancestorIds]
      }];
    }
    
    // If dragging between parent and its child, become first child of parent
    if (targetElement.parentId === prevElement.id) {
      return [{
        type: 'first-child' as const,
        depth: prevElement.depth + 1,
        parentId: prevElement.id,
        ancestorIds: [...prevElement.ancestorIds, prevElement.id]
      }];
    }
    
    // Default: match the previous element's depth and parent
    return [{
      type: 'between' as const,
      depth: prevElement.depth,
      parentId: prevElement.parentId,
      ancestorIds: [...prevElement.ancestorIds]
    }];
  }, [flatElements]);

  /**
   * Calculate drop position using ULTRA SIMPLE LOGIC
   */
  const calculateDropPosition = useCallback((
    clientY: number,
    clientX: number,
    targetElement: Element,
    targetId: string
  ): DropIndicatorState | null => {
    const rect = targetElement.getBoundingClientRect();
    const cs = getComputedStyle(targetElement as HTMLElement);
    const paddingLeft = parseFloat(cs.paddingLeft || '0') || 0;
    const paddingRight = parseFloat(cs.paddingRight || '0') || 0;
    
    // Special case: dropping at the end -> match last element's depth/parent
    if (targetId === '__end__') {
      const lastElement = flatElements[flatElements.length - 1];
      if (!lastElement) return null;
      
      return {
        type: 'between' as const,
        targetId: '__end__',
        depth: lastElement.depth,
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          paddingLeft,
          paddingRight
        },
        parentId: lastElement.parentId,
        ancestorIds: [...lastElement.ancestorIds],
        indentOffset: 0
      };
    }
    
    const flatElement = flatElements.find(el => el.id === targetId);
    
    if (!flatElement) return null;
    
    const elementIndex = flatElements.findIndex(el => el.id === targetId);
    
    // Use ultra simple logic - no cursor X position needed
    const positions = getDiscreteDropPositions(elementIndex, 0, flatElement);
    
    if (positions.length === 0) return null;
    
    const position = positions[0];
    
    const result = {
      type: position.type,
      targetId,
      depth: position.depth,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        paddingLeft,
        paddingRight
      },
      parentId: position.parentId,
      ancestorIds: position.ancestorIds,
      indentOffset: 0 // No indentation - always simple between lines
    };
    
    console.log('🎯 Drop preview (prev-item rule):', {
      depth: position.depth,
      parentId: position.parentId,
      type: position.type
    });
    
    return result;
  }, [flatElements, getDiscreteDropPositions]);
  
  /**
   * Check if element can be dropped at target
   */
  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    // Special case: always allow dropping at the end
    if (targetId === '__end__') return true;
    
    return canMoveElement(allFlatElements, draggedId, targetId);
  }, [allFlatElements]);
  
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
    // Small base indent so depth 0 isn't flush with the edge
    paddingLeft: `calc(${depth} * 1.5rem + 0.375rem)`,
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
   * Handle drag end - execute the move or duplicate operation
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Store duplication state before clearing drag state
    const shouldDuplicate = isDuplicateMode;
    
    // Clear drag state
    setActiveId(null);
    setDropIndicator(null);
    setIsDuplicateMode(false);
    
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
    const finalDropType = 
      dropIndicator?.type === 'nested' ? 'child' : 
      dropIndicator?.type === 'first-child' ? 'first-child' : 
      'before';
    
    try {
      // Handle duplication mode
      if (shouldDuplicate) {
        console.log('🎯 Duplicating element:', { draggedId, targetId });
        
        // Find the original element in the tree structure
        const findElementInTree = (elements: XMLElement[], id: string): XMLElement | null => {
          for (const element of elements) {
            if (element.id === id) {
              return element;
            }
            if (element.children.length > 0) {
              const found = findElementInTree(element.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const originalElement = findElementInTree(elements, draggedId);
        if (!originalElement) {
          console.error('❌ Original element not found for duplication');
          return;
        }

        // Create a duplicate with new IDs
        const duplicatedElement = duplicateXMLElement(originalElement);
        
        // Insert the duplicate at the target position
        let newTreeElements = [...elements];
        
        // Special case: dropping at the end
        if (targetId === '__end__') {
          newTreeElements.push(duplicatedElement);
        } else {
          // Convert to flat, insert duplicate, convert back to tree
          const duplicateAsFlat = treeToFlat([duplicatedElement]);
          const targetElement = allFlatElements.find(el => el.id === targetId);
          
          if (!targetElement) {
            console.error('❌ Target element not found for duplication');
            return;
          }

          // Calculate position for duplicate
          let newPosition;
          if (dropIndicator && dropIndicator.parentId !== undefined && dropIndicator.ancestorIds !== undefined) {
            newPosition = {
              newDepth: dropIndicator.depth,
              newParentId: dropIndicator.parentId,
              newAncestorIds: dropIndicator.ancestorIds
            };
          } else {
            newPosition = {
              newDepth: targetElement.depth,
              newParentId: targetElement.parentId,
              newAncestorIds: [...targetElement.ancestorIds]
            };
          }

          // Update duplicate element with correct positioning
          const updatedDuplicate = duplicateAsFlat.map(element => ({
            ...element,
            depth: element.depth - duplicateAsFlat[0].depth + newPosition.newDepth,
            parentId: element === duplicateAsFlat[0] ? newPosition.newParentId : element.parentId,
            ancestorIds: element === duplicateAsFlat[0] ? 
              newPosition.newAncestorIds : 
              [...newPosition.newAncestorIds, ...element.ancestorIds.slice(1)]
          }));

          // Insert into flat array
          const finalDropType = 
            dropIndicator?.type === 'nested' ? 'child' : 
            dropIndicator?.type === 'first-child' ? 'first-child' : 
            'before';

          const updatedFlat = insertElementsInFlat(allFlatElements, updatedDuplicate, targetId, finalDropType);
          newTreeElements = flatToTree(updatedFlat);
        }
        
        onElementsChange(newTreeElements);
        console.log('✅ Duplication completed:', { originalId: draggedId, newId: duplicatedElement.id });
        return;
      }

      // Original move logic continues below...
      
      // Special case: dropping at the end -> treat as AFTER last element, matching last element's depth/parent
      if (targetId === '__end__') {
        const last = flatElements[flatElements.length - 1];
        if (!last) return;

        const newPosition = {
          newDepth: last.depth,
          newParentId: last.parentId,
          newAncestorIds: [...last.ancestorIds]
        };
        const updatedFlat = moveElementInFlat(allFlatElements, draggedId, last.id, 'after', newPosition);
        const newTreeElements = flatToTree(updatedFlat);
        onElementsChange(newTreeElements);

        console.log('✅ Move to end (after last) completed:', { draggedId, lastId: last.id });
        return;
      }
      
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
        newPosition = calculateNewPosition(allFlatElements, draggedId, targetId, finalDropType);
      }
      
      // Perform the move operation
      const updatedFlat = moveElementInFlat(allFlatElements, draggedId, targetId, finalDropType, newPosition);
      
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
  }, [allFlatElements, flatElements, dropIndicator, canDrop, onElementsChange, isDuplicateMode, elements]);
  
  return {
    // State
    activeId,
    draggedElement,
    dropIndicator,
    isDragging,
    isDuplicateMode,
    
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
  dropType: 'before' | 'after' | 'child' | 'first-child',
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
    case 'first-child':
      // Insert immediately after the parent (as first child), regardless of which child is the current target
      const parentIndexInOriginal = flatElements.findIndex(el => el.id === newPosition.newParentId);
      insertIndex = (parentIndexInOriginal === -1 ? originalTargetIndex : parentIndexInOriginal) + 1;
      
      console.log('🎯 First child insertion:', {
        targetId,
        parentIndex: parentIndexInOriginal,
        insertIndex,
        arrayLength: flatElements.length
      });
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
 * Move element to the end of the tree (at root level)
 */
function moveElementToEnd(
  flatElements: FlatXMLElement[],
  draggedId: string
): FlatXMLElement[] {
  const draggedIndex = flatElements.findIndex(el => el.id === draggedId);
  if (draggedIndex === -1) {
    throw new Error('Element not found in flat array');
  }
  
  const draggedElement = flatElements[draggedIndex];
  
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
  
  // Update the moved elements to be at root level
  const updatedElementsToMove = elementsToMove.map(element => {
    if (element.id === draggedId) {
      // For the moved element itself: place at root level
      return {
        ...element,
        depth: 0,
        parentId: null,
        ancestorIds: []
      };
    } else {
      // For descendants: update their ancestry chain
      const draggedIndex = element.ancestorIds.indexOf(draggedId);
      let newAncestorIds;
      
      if (draggedIndex !== -1) {
        // Keep only the ancestry below the moved parent
        newAncestorIds = [draggedId, ...element.ancestorIds.slice(draggedIndex + 1)];
      } else {
        // Fallback: shouldn't happen
        newAncestorIds = element.ancestorIds;
      }
      
      return {
        ...element,
        depth: element.depth - draggedElement.depth, // Adjust depth relative to new parent depth
        ancestorIds: newAncestorIds
      };
    }
  });
  
  // Append the moved elements at the end
  result.push(...updatedElementsToMove);
  
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
 * Insert elements into flat array at target position (for duplication)
 */
function insertElementsInFlat(
  flatElements: FlatXMLElement[],
  elementsToInsert: FlatXMLElement[],
  targetId: string,
  dropType: 'before' | 'after' | 'child' | 'first-child'
): FlatXMLElement[] {
  const targetIndex = flatElements.findIndex(el => el.id === targetId);
  if (targetIndex === -1) {
    throw new Error('Target element not found in flat array');
  }
  
  let insertIndex: number;
  
  switch (dropType) {
    case 'before':
      insertIndex = targetIndex;
      break;
    case 'after':
      insertIndex = targetIndex + 1;
      break;
    case 'first-child':
      // Insert immediately after the parent
      insertIndex = targetIndex + 1;
      break;
    case 'child':
      // Insert after the last child of target element
      const lastChildIndex = findLastChildIndex(flatElements, targetId);
      insertIndex = lastChildIndex + 1;
      break;
    default:
      throw new Error(`Invalid drop type: ${dropType}`);
  }
  
  // Create a copy of the flat array
  const result = [...flatElements];
  
  // Insert the new elements
  result.splice(insertIndex, 0, ...elementsToInsert);
  
  // Recalculate order values for all elements
  return recalculateOrderValues(result);
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
