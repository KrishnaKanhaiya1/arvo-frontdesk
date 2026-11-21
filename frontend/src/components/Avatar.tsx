import React from 'react';
import { stringToColor } from '../lib/utils';

interface AvatarProps {
  name: string;
  initials?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  initials,
  color,
  size = 'md',
  className = '',
}) => {
  const computedInitials = initials || (name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?');
  const bgColor = color || stringToColor(name || 'User');

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-medium',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold select-none flex-shrink-0 text-slate-800 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {computedInitials}
    </div>
  );
};
