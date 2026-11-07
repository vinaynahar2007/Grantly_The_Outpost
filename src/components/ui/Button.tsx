import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle" | "emerald";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#6D28D9] text-white border border-[#6D28D9] shadow-xs hover:bg-[#5B21B6] hover:border-[#5B21B6] active:bg-[#4C1D95]",
  secondary:
    "bg-white text-[#0F172A] border border-[#E2E8F0] shadow-2xs hover:bg-[#F8F9FC] hover:border-[#CBD5E1] active:bg-[#F1F4F9]",
  ghost:
    "bg-transparent text-[#334155] border border-transparent hover:bg-[#F1F4F9] hover:text-[#0F172A] active:bg-[#E2E8F0]/60",
  subtle:
    "bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]/70 hover:bg-[#EDE9FE] hover:border-[#C4B5FD]",
  emerald:
    "bg-[#059669] text-white border border-[#059669] shadow-xs hover:bg-[#047857] hover:border-[#047857]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-[9px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-sm gap-2 rounded-[11px]",
  icon: "h-9 w-9 p-0 rounded-[10px] justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      fullWidth = false,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-all duration-150 select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
