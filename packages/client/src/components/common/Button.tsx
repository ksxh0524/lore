import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    variant,
    `size-${size}`,
    fullWidth ? 'full-width' : '',
    loading ? 'loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button {...props} disabled={disabled || loading} className={classes}>
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
}