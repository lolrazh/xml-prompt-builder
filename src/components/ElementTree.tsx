
import React from 'react';
import { XMLElement } from './PromptBuilder';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import DragHandle from './DragHandle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ElementTreeProps {
  elements: XMLElement[];
  onElementSelect: (element: XMLElement) => void;
  onAddChild: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  onToggleCollapse: (elementId: string) => void;
  onToggleVisibility: (elementId: string) => void;
  onMoveUp: (elementId: string) => void;
  onMoveDown: (elementId: string) => void;
  selectedElementId: string | undefined;
  depth?: number;
}

interface SortableElementProps {
  element: XMLElement;
  onElementSelect: (element: XMLElement) => void;
  onAddChild: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  onToggleCollapse: (elementId: string) => void;
  onToggleVisibility: (elementId: string) => void;
  onMoveUp: (elementId: string) => void;
  onMoveDown: (elementId: string) => void;
  selectedElementId: string | undefined;
  depth: number;
}

const SortableElement: React.FC<SortableElementProps> = ({
  element,
  onElementSelect,
  onAddChild,
  onDelete,
  onToggleCollapse,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  selectedElementId,
  depth,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-2",
        isDragging && "opacity-50"
      )}
    >
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded cursor-pointer group",
          selectedElementId === element.id ? "bg-[#9AE66E]/50" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
      >
        <DragHandle 
          className="flex-shrink-0" 
          {...attributes}
          {...listeners}
        />
        
        {element.children.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={() => onToggleCollapse(element.id)}
          >
            {element.collapsed ? (
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            ) : (
              <ChevronDown className="h-4 w-4 stroke-[3]" />
            )}
          </Button>
        )}
        
        <div 
          className="flex-1 flex items-center gap-1 font-bold"
          onClick={() => onElementSelect(element)}
        >
          <span className="text-gray-600 dark:text-gray-400 font-black">&lt;</span>
          <span className="font-mono">{element.tagName}</span>
          <span className="text-gray-600 dark:text-gray-400 font-black">&gt;</span>
          
          {element.content && (
            <span className="text-xs text-gray-500 truncate max-w-[150px] font-normal">
              {element.content}
            </span>
          )}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(element.id);
            }}
          >
            {element.isVisible ? <Eye className="h-4 w-4 stroke-[3]" /> : <EyeOff className="h-4 w-4 stroke-[3]" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(element.id);
            }}
          >
            <ArrowUp className="h-4 w-4 stroke-[3]" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(element.id);
            }}
          >
            <ArrowDown className="h-4 w-4 stroke-[3]" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(element.id);
            }}
          >
            <Plus className="h-4 w-4 stroke-[3]" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(element.id);
            }}
          >
            <Trash className="h-4 w-4 stroke-[3]" />
          </Button>
        </div>
      </div>
      
      {element.children.length > 0 && !element.collapsed && (
        <ElementTree
          elements={element.children}
          onElementSelect={onElementSelect}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onToggleCollapse={onToggleCollapse}
          onToggleVisibility={onToggleVisibility}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          selectedElementId={selectedElementId}
          depth={depth + 1}
        />
      )}
    </div>
  );
};

const ElementTree: React.FC<ElementTreeProps> = ({
  elements,
  onElementSelect,
  onAddChild,
  onDelete,
  onToggleCollapse,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  selectedElementId,
  depth = 0,
}) => {
  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 pl-2 border-l-2 border-black dark:border-gray-700")}>
      {elements.map((element) => (
        <SortableElement
          key={element.id}
          element={element}
          onElementSelect={onElementSelect}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onToggleCollapse={onToggleCollapse}
          onToggleVisibility={onToggleVisibility}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          selectedElementId={selectedElementId}
          depth={depth}
        />
      ))}
    </div>
  );
};

export default ElementTree;
