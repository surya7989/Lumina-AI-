export default function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
}) {
  const baseClass =
    'relative overflow-hidden bg-white/5 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:animate-shimmer';

  const style = {
    width: width || '100%',
    height: height || variant === 'circle' ? width || '40px' : '1rem',
    borderRadius: variant === 'circle' ? '9999px' : undefined,
  };

  return (
    <div
      className={`${baseClass} ${className}`}
      style={style}
    />
  );
}
