import { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      type = 'text',
      className = '',
      register,
      name,
      ...props
    },
    ref
  ) => {
    const inputProps = register ? { ...register(name) } : {};

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`
              w-full rounded-xl border border-white/10 bg-white/5
              px-4 py-2.5 text-gray-100 placeholder-gray-500
              transition-all duration-200
              focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none
              ${Icon ? 'pl-10' : ''}
              ${error ? 'border-white/20 focus:border-white focus:ring-white/10' : ''}
              ${className}
            `}
            {...inputProps}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
