import { forwardRef, useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { cx } from './cx';
import { Tip } from './Tip';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders aria-disabled (still focusable) and blocks clicks. */
  inactive?: boolean;
  /** When inactive, explains why (tooltip + aria-describedby). */
  disabledReason?: string;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary: 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  subtle: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', inactive, disabledReason, icon, trailingIcon, className, children, onClick, type = 'button', ...rest },
  ref,
) {
  const reasonId = useId();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (inactive) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };
  const button = (
    <button
      ref={ref}
      type={type}
      aria-disabled={inactive || undefined}
      aria-describedby={inactive && disabledReason ? reasonId : rest['aria-describedby']}
      onClick={handleClick}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors',
        variants[variant],
        sizes[size],
        inactive && 'cursor-not-allowed opacity-50 hover:bg-[inherit]',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
      {inactive && disabledReason && (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      )}
    </button>
  );
  return inactive && disabledReason ? <Tip content={disabledReason}>{button}</Tip> : button;
});
