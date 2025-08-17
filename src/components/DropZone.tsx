import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
  isActive?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  id, 
  children, 
  className,
  isActive = false 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-colors h-0 overflow-visible",
        className
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-x-0 h-0.5 bg-black dark:bg-white -top-px z-10" />
      )}
    </div>
  );
};

export default DropZone;