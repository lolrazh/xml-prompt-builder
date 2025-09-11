import React from 'react';

type PixelQuestionAvatarProps = {
  className?: string;
};

// A tiny pixelated question mark avatar using CSS pixel-art
const PixelQuestionAvatar: React.FC<PixelQuestionAvatarProps> = ({ className }) => {
  return (
    <div
      className={
        'relative overflow-hidden bg-white ' +
        (className ?? '')
      }
      aria-label="Loading avatar"
    >
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          // Define a simple 8x8 question pattern: boolean mask
          const on = questionMask[row][col];
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={on ? 'bg-gray-800' : 'bg-transparent'}
              style={{ imageRendering: 'pixelated' as any }}
            />
          );
        })}
      </div>
    </div>
  );
};

const questionMask: boolean[][] = [
  // 8x8 pixel-art question mark (true = filled)
  [false, true,  true,  true,  true,  true,  false, false],
  [true,  false, false, false, false, true,  false, false],
  [false, false, false, true,  true,  true,  false, false],
  [false, false, true,  false, false, true,  false, false],
  [false, false, true,  true,  true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
  [false, false, false, false, true,  false, false, false],
];

export default PixelQuestionAvatar;


