import React from 'react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

const DragHandle: React.FC<DragHandleProps> = ({ 
  className, 
  onMouseDown, 
  onTouchStart 
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm transition-colors group-hover:opacity-100 opacity-50",
        className
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="button"
      aria-label="Drag to reorder"
      tabIndex={0}
    >
      {/* First row of dots */}
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
      {/* Second row of dots */}
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
      {/* Third row of dots */}
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
    </div>
  );
};

export default DragHandle;