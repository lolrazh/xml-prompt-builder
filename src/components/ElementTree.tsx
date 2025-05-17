
import React from 'react';
import { XMLElement } from './PromptBuilder';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementTreeProps {
  elements: XMLElement[];
  onElementSelect: (element: XMLElement) => void;
  onAddChild: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  onToggleCollapse: (elementId: string) => void;
  selectedElementId: string | undefined;
  depth?: number;
}

const ElementTree: React.FC<ElementTreeProps> = ({
  elements,
  onElementSelect,
  onAddChild,
  onDelete,
  onToggleCollapse,
  selectedElementId,
  depth = 0,
}) => {
  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 pl-2 border-l-2 border-black dark:border-gray-700")}>
      {elements.map((element) => (
        <div key={element.id} className="space-y-2">
          <div 
            className={cn(
              "flex items-center gap-2 p-2 rounded cursor-pointer group",
              selectedElementId === element.id ? "bg-[#9AE66E]/50" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
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
              selectedElementId={selectedElementId}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ElementTree;
