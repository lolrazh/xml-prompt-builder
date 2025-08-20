// Drop Indicator Line - The Elegant Black Line of Precision
// Shows exactly where elements will drop with beautiful animations

import React from 'react';
import { cn } from '@/lib/utils';
import type { DropIndicatorState } from '@/hooks/useXMLTreeDragDrop';

interface DropIndicatorLineProps {
  indicator: DropIndicatorState | null;
  className?: string;
}

const DropIndicatorLine: React.FC<DropIndicatorLineProps> = ({ 
  indicator, 
  className 
}) => {
  if (!indicator) return null;

  const { type, depth, position } = indicator;
  
  // Calculate positioning to align perfectly inside rounded item boxes
  const getLineStyles = (): React.CSSProperties => {
    // Use the actual computed paddings of the target item for perfect symmetry
    const inset = 2; // avoid touching rounded corners
    const left = position.x + (position.paddingLeft ?? 0) + inset;
    const right = position.x + position.width - (position.paddingRight ?? 0) - inset;
    const width = Math.max(0, right - left);

    const top = Math.round(position.y) - 1;

    return {
      position: 'fixed',
      height: 2,
      backgroundColor: '#000',
      borderRadius: 9999,
      zIndex: 1000,
      pointerEvents: 'none',
      // Use transform for smoother, GPU-accelerated movement
      left: 0,
      top: 0,
      width,
      opacity: 1,
      transform: `translate3d(${left}px, ${top}px, 0)`,
      transition: 'transform 80ms ease-out, opacity 120ms ease-out',
      willChange: 'transform, opacity, width',
    } as React.CSSProperties;
  };

  return (
    <div
      className={cn('drop-indicator-line', className)}
      style={getLineStyles()}
      data-drop-type={type}
      data-testid="drop-indicator"
    />
  );
};

export default DropIndicatorLine;
