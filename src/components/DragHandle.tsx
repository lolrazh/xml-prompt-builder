import React from 'react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For spreading dnd-kit attributes and listeners
}

const DragHandle: React.FC<DragHandleProps> = ({ 
  className, 
  onMouseDown, 
  onTouchStart,
  ...rest
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-0.5 py-1 cursor-grab active:cursor-grabbing transition-all w-3 h-4 items-center justify-center opacity-100",
        className
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="button"
      aria-label="Drag to reorder"
      tabIndex={0}
      {...rest}
    >
      {/* First row of dots */}
      <div className="flex gap-0.5">
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
      {/* Second row of dots */}
      <div className="flex gap-0.5">
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
      {/* Third row of dots */}
      <div className="flex gap-0.5">
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <div className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
      </div>
    </div>
  );
};

export default DragHandle;