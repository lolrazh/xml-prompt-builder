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
    // Match XMLTreeItem padding and depth indentation:
    // - Each item has p-2 (8px) horizontal padding
    // - Depth indent is 1.5rem (24px) per level + 0.375rem (6px) base
    const itemHPad = 8; // px from p-2
    const baseDepthPad = 6; // px from 0.375rem
    const depthPad = depth * 24 + baseDepthPad; // px
    const inset = 2; // extra inset to avoid touching rounded corners

    // Compute left/right inside the item box so the line never bleeds past rounded edges
    const left = position.x + itemHPad + depthPad + inset;
    const right = position.x + position.width - itemHPad - inset;
    const width = Math.max(0, right - left);

    return {
      position: 'fixed',
      height: 2,
      backgroundColor: '#000',
      borderRadius: 9999, // fully rounded ends
      zIndex: 1000,
      transition: 'opacity 120ms ease-out, left 80ms ease-out, width 80ms ease-out, top 80ms ease-out',
      pointerEvents: 'none',
      left,
      // Place exactly at the boundary between items; offset by 1px to center the 2px line
      top: Math.round(position.y) - 1,
      width,
      opacity: 1,
      transform: 'none',
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
