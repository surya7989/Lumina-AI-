import { motion } from 'framer-motion';

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  padding = 'md',
  className = '',
  hover = true,
  ...props
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : {}}
      className={`
        rounded-2xl border border-white/10
        bg-white/[0.03] backdrop-blur-xl
        transition-all duration-300
        ${hover ? 'hover:shadow-xl hover:shadow-indigo-500/5 hover:border-white/20' : ''}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
