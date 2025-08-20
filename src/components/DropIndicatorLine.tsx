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
  
  // Calculate positioning based on drop type
  const getLineStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      height: '2px',
      backgroundColor: '#000000', // Clean consistent black line
      borderRadius: '1px',
      zIndex: 1000,
      transition: 'all 0.15s ease-out',
      pointerEvents: 'none',
      // Subtle shadow for visibility
      boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)',
    };

    // SIMPLIFIED: Same line style, different indentation for nesting
    const baseIndent = depth * 24; // Standard depth indentation
    const extraIndent = indicator.indentOffset || 0; // Additional indent for nested drops
    const leftBleed = 4; // Small bleed on the left
    
    const totalIndent = baseIndent + extraIndent;
    const lineWidth = type === 'nested' 
      ? position.width - totalIndent + leftBleed - 20 // Shorter line for nested drops
      : position.width - baseIndent + leftBleed; // Full line for between drops
    
    return {
      ...baseStyles,
      left: position.x + totalIndent - leftBleed,
      top: position.y - 1, // Always at element boundary
      width: lineWidth,
      // Clean consistent styling - no special effects
      opacity: 1,
      transform: 'none',
    };
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