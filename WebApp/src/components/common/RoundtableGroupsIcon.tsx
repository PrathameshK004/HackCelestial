import React from 'react';

interface RoundtableGroupsIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const RoundtableGroupsIcon: React.FC<RoundtableGroupsIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* 1. TOP PERSON */}
      {/* Head */}
      <circle cx="50" cy="19" r="8.5" />
      {/* Torso with V-neck cutout */}
      <path
        d="M36 43C36 34 41 28 47 28L50 33L53 28C59 28 64 34 64 43C59.5 40.5 54.8 39.5 50 39.5C45.2 39.5 40.5 40.5 36 43Z"
      />

      {/* 2. LEFT PERSON */}
      {/* Head */}
      <circle cx="21" cy="30.5" r="8" />
      {/* Chair Backrest */}
      <path
        d="M9 43C9 40.5 10.5 39 12 39C13.5 39 13.5 40.5 13.5 43V58C13.5 61 14.5 63 17 64C12.5 64 9 60 9 55V43Z"
      />
      {/* Body & Arm reaching table */}
      <path
        d="M13.5 52C13.5 42 20 38 27.5 40.5C27 45.5 24 50 20 53.5L28 53.5C31.5 53.5 35 55 37 57.5C36.5 59.5 34.5 60.5 32 60.5C28.5 60.5 25 58 22 55.5L18 63C15 62 13.5 57 13.5 52Z"
      />

      {/* 3. RIGHT PERSON */}
      {/* Head */}
      <circle cx="79" cy="30.5" r="8" />
      {/* Chair Backrest */}
      <path
        d="M91 43C91 40.5 89.5 39 88 39C86.5 39 86.5 40.5 86.5 43V58C86.5 61 85.5 63 83 64C87.5 64 91 60 91 55V43Z"
      />
      {/* Body & Arm reaching table */}
      <path
        d="M86.5 52C86.5 42 80 38 72.5 40.5C73 45.5 76 50 80 53.5L72 53.5C68.5 53.5 65 55 63 57.5C63.5 59.5 65.5 60.5 68 60.5C71.5 60.5 75 58 78 55.5L82 63C85 62 86.5 57 86.5 52Z"
      />

      {/* 4. ROUND TABLE (Upper and lower connecting arcs) */}
      {/* Upper Table Arc */}
      <path
        d="M29 48.5C35 43.5 42.2 41 50 41C57.8 41 65 43.5 71 48.5C69 50 67 50.5 65 49.5C60.5 47 55.5 45.5 50 45.5C44.5 45.5 39.5 47 35 49.5C33 50.5 31 50 29 48.5Z"
      />
      {/* Lower Table Arc */}
      <path
        d="M20 57C23.5 64.5 35 69.5 50 69.5C65 69.5 76.5 64.5 80 57C78 55.5 75.5 56.5 74 58.5C70 63 60.5 66 50 66C39.5 66 30 63 26 58.5C24.5 56.5 22 55.5 20 57Z"
      />

      {/* 5. BOTTOM FOREGROUND PERSON */}
      {/* Head */}
      <circle cx="50" cy="51.5" r="10" />
      {/* Shoulders */}
      <path
        d="M32 75C32 66 40 61.5 50 61.5C60 61.5 68 66 68 75H32Z"
      />
      {/* Bottom Chair Legs / Frame */}
      <path
        d="M33 75.5V85C33 87.8 35.2 90 38 90H62C64.8 90 67 87.8 67 85V75.5H62.5V85C62.5 85.3 62.3 85.5 62 85.5H38C37.7 85.5 37.5 85.3 37.5 85V75.5H33Z"
      />
    </svg>
  );
};
