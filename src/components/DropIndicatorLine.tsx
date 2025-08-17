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
      backgroundColor: '#000000', // Beautiful black line
      borderRadius: '1px',
      zIndex: 1000,
      transition: 'all 0.15s ease-out',
      pointerEvents: 'none',
      // Add subtle glow for visibility
      boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)',
    };

    // Calculate horizontal positioning with depth-based indentation
    const indentOffset = depth * 24; // 1.5rem = 24px
    const leftBleed = 4; // 4px bleed on the left (Atlassian pattern)
    
    return {
      ...baseStyles,
      left: position.x - leftBleed + indentOffset,
      top: position.y - 1, // Center the 2px line
      width: position.width - indentOffset + leftBleed,
      // Add visual cues for different drop types
      opacity: type === 'child' ? 0.8 : 1,
      transform: type === 'child' ? 'scaleY(1.5)' : 'scaleY(1)',
    };
  };

  const getIndicatorIcon = () => {
    switch (type) {
      case 'child':
        return '→'; // Arrow pointing right for child drops
      case 'before':
        return '↑'; // Arrow pointing up for before drops  
      case 'after':
        return '↓'; // Arrow pointing down for after drops
      default:
        return '';
    }
  };

  return (
    <>
      {/* Main drop line */}
      <div
        className={cn('drop-indicator-line', className)}
        style={getLineStyles()}
        data-drop-type={type}
        data-testid="drop-indicator"
      />
      
      {/* Optional: Small indicator icon for drop type */}
      {type === 'child' && (
        <div
          style={{
            position: 'fixed',
            left: position.x + depth * 24 - 8,
            top: position.y - 8,
            width: '16px',
            height: '16px',
            backgroundColor: '#000000',
            color: '#ffffff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 1001,
            transition: 'all 0.15s ease-out',
            pointerEvents: 'none',
          }}
          data-testid="child-indicator"
        >
          {getIndicatorIcon()}
        </div>
      )}
    </>
  );
};

export default DropIndicatorLine;