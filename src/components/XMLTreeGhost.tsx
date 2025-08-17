// XML Tree Ghost - The Beautiful Element That Follows Your Cursor
// Elegant, subtle representation of what you're dragging

import React from 'react';
import { cn } from '@/lib/utils';
import type { FlatXMLElement } from '@/lib/tree-conversion';

interface XMLTreeGhostProps {
  element: FlatXMLElement;
  className?: string;
}

const XMLTreeGhost: React.FC<XMLTreeGhostProps> = ({ 
  element, 
  className 
}) => {
  return (
    <div
      className={cn(
        // Base ghost styling - subtle and elegant
        "xml-tree-ghost",
        "flex items-center gap-2 p-2 rounded",
        "bg-gray-100 dark:bg-gray-800",
        "border border-gray-300 dark:border-gray-600",
        "shadow-lg",
        // Transform for visual appeal (subtle tilt)
        "transform rotate-1",
        // Ensure it's above everything
        "z-[9999]",
        // Smooth appearance
        "opacity-90",
        "transition-all duration-200",
        // Pointer events disabled (it's just visual)
        "pointer-events-none",
        // Custom styling
        className
      )}
      data-testid="drag-ghost"
    >
      
      {/* Drag handle placeholder - shows the six dots */}
      <div className="flex flex-col gap-0.5 px-0.5 py-1 w-3 h-4 items-center justify-center opacity-60">
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
      
      {/* Element representation - clean and minimal */}
      <div className="flex items-center gap-1 font-bold min-w-0">
        <span className="text-gray-600 dark:text-gray-400 font-black">&lt;</span>
        <span className="font-mono text-gray-800 dark:text-gray-200">{element.tagName}</span>
        <span className="text-gray-600 dark:text-gray-400 font-black">&gt;</span>
        
        {/* Show content preview if exists */}
        {element.content && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px] font-normal ml-1">
            {element.content}
          </span>
        )}
      </div>

      {/* Depth indicator - small badge */}
      <div className="ml-auto flex-shrink-0">
        <div className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 font-mono">
          depth {element.depth}
        </div>
      </div>
      
    </div>
  );
};

export default XMLTreeGhost;