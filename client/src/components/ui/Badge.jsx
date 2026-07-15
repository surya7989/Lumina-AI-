const variants = {
  success: 'bg-white/5 text-emerald-400 border-white/10',
  warning: 'bg-white/5 text-amber-400 border-white/10',
  error: 'bg-white/5 text-red-400 border-white/10',
  info: 'bg-white/5 text-indigo-400 border-white/10',
  default: 'bg-white/5 text-gray-400 border-white/10',
};

const dotColors = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-indigo-400',
  default: 'bg-gray-400',
};

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        rounded-full text-xs font-medium border
        ${variants[variant]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
