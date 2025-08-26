// XML Tree Item - Individual Element Renderer
// Beautiful, stationary elements with perfect depth styling

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import DragHandle from './DragHandle';
import type { FlatXMLElement } from '@/lib/tree-conversion';

interface XMLTreeItemProps {
  element: FlatXMLElement;
  isSelected: boolean;
  isDragging: boolean;
  isAnyDragActive: boolean;
  isValidDropTarget: boolean;
  isOverTarget: boolean;
  isDuplicateMode?: boolean;
  onElementClick: (element: FlatXMLElement) => void;
  onAddChild: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  onToggleCollapse: (elementId: string) => void;
  onToggleVisibility: (elementId: string) => void;
  onMoveUp: (elementId: string) => void;
  onMoveDown: (elementId: string) => void;
  style?: React.CSSProperties;
}

const XMLTreeItem: React.FC<XMLTreeItemProps> = ({
  element,
  isSelected,
  isDragging,
  isAnyDragActive,
  isValidDropTarget,
  isOverTarget,
  isDuplicateMode,
  onElementClick,
  onAddChild,
  onDelete,
  onToggleCollapse,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  style
}) => {
  const isMobile = useIsMobile();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: element.id,
    // Disable layout animations to keep elements stationary
    animateLayoutChanges: () => false,
  });

  // STATIONARY BEHAVIOR: No transforms for ANY element during drag operations
  const itemStyle = {
    ...style,
    transform: isAnyDragActive ? 'none' : CSS.Transform.toString(transform),
    transition: isAnyDragActive ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1, // Only the dragged element becomes transparent
  };

  // Check if element currently has children
  const hasCollapsibleChildren = element.hasChildren;

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      className={cn(
        "xml-tree-item group relative",
        "flex items-center gap-2 p-2 rounded cursor-pointer",
        "transition-colors duration-200",
        isSelected && "bg-[#9AE66E]/50",
        !isSelected && "hover:bg-gray-100 dark:hover:bg-gray-800",
        isDragging && "z-50",
        // Only outline the current hovered drop target; keep it inside rounded edges
        isOverTarget && !isDragging && !isDuplicateMode && "ring-2 ring-inset ring-blue-400/60",
        // Special styling for duplicate mode drops
        isOverTarget && !isDragging && isDuplicateMode && "ring-2 ring-inset ring-green-400/60 bg-green-50/50"
      )}
      data-tree-item={element.id}
      data-testid={`tree-item-${element.id}`}
    >
      
      {/* Depth indicator line (connects to parent) */}
      {element.depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600 opacity-30"
          style={{
            left: `${(element.depth - 1) * 24 + 12}px`, // 1.5rem = 24px, center at 12px
          }}
        />
      )}

      {/* Drag handle - always visible, perfectly positioned */}
      <DragHandle 
        className="flex-shrink-0 xml-tree-drag-handle" 
        {...attributes}
        {...listeners}
      />
      
      {/* Collapse/expand button for elements with children */}
      {hasCollapsibleChildren && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(element.id);
          }}
        >
          {element.collapsed ? (
            <ChevronRight className="h-4 w-4 stroke-[3]" />
          ) : (
            <ChevronDown className="h-4 w-4 stroke-[3]" />
          )}
        </Button>
      )}
      
      {/* Element content - the beautiful XML representation */}
      <div 
        className="flex-1 flex items-center gap-1 font-bold min-w-0"
        onClick={() => onElementClick(element)}
      >
        <span className="text-gray-600 dark:text-gray-400 font-black">&lt;</span>
        <span className="font-mono truncate">{element.tagName}</span>
        <span className="text-gray-600 dark:text-gray-400 font-black">&gt;</span>
        
        {/* Show content preview if exists */}
        {element.content && (
          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 truncate max-w-[150px] font-normal ml-2`}>
            {element.content}
          </span>
        )}

        {/* Duplicate mode indicator */}
        {isDuplicateMode && isDragging && (
          <span className="text-xs font-bold text-green-600 bg-green-100 px-1 py-0.5 rounded ml-2">
            COPY
          </span>
        )}

      </div>
      
      {/* Action buttons - appear on hover */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity flex-shrink-0">
        
        {/* Visibility toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(element.id);
          }}
          title={element.isVisible ? 'Hide element' : 'Show element'}
        >
          {element.isVisible ? 
            <Eye className="h-4 w-4 stroke-[3]" /> : 
            <EyeOff className="h-4 w-4 stroke-[3]" />
          }
        </Button>

        {/* Move up */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(element.id);
          }}
          title="Move up"
        >
          <ArrowUp className="h-4 w-4 stroke-[3]" />
        </Button>
        
        {/* Move down */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(element.id);
          }}
          title="Move down"
        >
          <ArrowDown className="h-4 w-4 stroke-[3]" />
        </Button>
        
        {/* Add child */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(element.id);
          }}
          title="Add child element"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
        </Button>
        
        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(element.id);
          }}
          title="Delete element"
        >
          <Trash className="h-4 w-4 stroke-[3]" />
        </Button>
      </div>
    </div>
  );
};

export default XMLTreeItem;
