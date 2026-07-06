import { mediaUrl } from '../api/axios.js';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export default function Avatar({ username, avatar, size = 'md', online, className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={mediaUrl(avatar)}
          alt={username}
          className={`${sizeClass} rounded-full object-cover border border-surface-border`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-display font-semibold bg-void text-ember-400 border border-surface-border`}
        >
          {username?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-ember-400 border-2 border-surface shadow-neon" />
      )}
    </div>
  );
}
