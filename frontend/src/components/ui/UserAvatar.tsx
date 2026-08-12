import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md' }) => {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || 'User'}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-blue-500/30`}
      />
    );
  }
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email[0].toUpperCase();
  return (
    <div
      className={`${sizeMap[size]} rounded-full glow-gradient text-white flex items-center justify-center font-bold`}
    >
      {initials || <UserIcon className="w-4 h-4" />}
    </div>
  );
};
