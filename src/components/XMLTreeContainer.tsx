// XML Tree Container - The Orchestra Conductor
// Manages the entire drag-and-drop tree experience with flat structure

import React from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { useXMLTreeDragDrop } from '@/hooks/useXMLTreeDragDrop';
import DropIndicatorLine from './DropIndicatorLine';
import XMLTreeItem from './XMLTreeItem';
import XMLTreeGhost from './XMLTreeGhost';
import type { XMLElement } from './PromptBuilder';

interface XMLTreeContainerProps {
  elements: XMLElement[];
  onElementsChange: (elements: XMLElement[]) => void;
  onElementSelect: (element: XMLElement) => void;
  selectedElementId?: string;
  onAddChild: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  onToggleCollapse: (elementId: string) => void;
  onToggleVisibility: (elementId: string) => void;
  onMoveUp: (elementId: string) => void;
  onMoveDown: (elementId: string) => void;
  className?: string;
}

const XMLTreeContainer: React.FC<XMLTreeContainerProps> = ({
  elements,
  onElementsChange,
  onElementSelect,
  selectedElementId,
  onAddChild,
  onDelete,
  onToggleCollapse,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  className
}) => {
  
  // Our beautiful drag hook that handles everything
  const {
    activeId,
    draggedElement,
    dropIndicator,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    canDrop,
    getDepthStyle,
    isValidDropTarget,
    flatElements
  } = useXMLTreeDragDrop(elements, onElementsChange);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Handle element selection from tree
  const handleElementClick = (flatElement: typeof flatElements[0]) => {
    // Convert flat element back to XMLElement format for selection
    const xmlElement: XMLElement = {
      id: flatElement.id,
      tagName: flatElement.tagName,
      content: flatElement.content,
      collapsed: flatElement.collapsed,
      isVisible: flatElement.isVisible,
      children: [] // Children not needed for selection
    };
    onElementSelect(xmlElement);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={flatElements.map(el => el.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className={cn('xml-tree-container', className)}>
          
          {/* The main tree list */}
          <div className="xml-tree-list space-y-1">
            {flatElements.map((flatElement) => (
              <XMLTreeItem
                key={flatElement.id}
                element={flatElement}
                isSelected={selectedElementId === flatElement.id}
                isDragging={activeId === flatElement.id}
                isAnyDragActive={isDragging}
                isValidDropTarget={isValidDropTarget(flatElement.id)}
                onElementClick={handleElementClick}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onToggleCollapse={onToggleCollapse}
                onToggleVisibility={onToggleVisibility}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                style={getDepthStyle(flatElement.depth)}
              />
            ))}
          </div>

          {/* Empty state */}
          {flatElements.length === 0 && (
            <div className="xml-tree-empty text-center text-gray-400 text-sm py-8">
              <p>No elements yet. Add an element to begin building your prompt.</p>
            </div>
          )}

        </div>
      </SortableContext>

      {/* Beautiful drop indicator line */}
      <DropIndicatorLine 
        indicator={dropIndicator} 
        className="drop-indicator-overlay"
      />

      {/* Ghost element that follows cursor */}
      <DragOverlay>
        {draggedElement && (
          <XMLTreeGhost element={draggedElement} />
        )}
      </DragOverlay>
      
    </DndContext>
  );
};

export default XMLTreeContainer;