import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: CardPadding;
  tinted?: boolean;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-7",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = "none", tinted = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-[#E2E8F0] transition-all duration-200",
          tinted ? "bg-[#F8F9FC]" : "bg-white",
          "shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04),_0_1px_3px_0_rgb(15_23_42_/_0.02)]",
          interactive &&
            "hover:border-[#CBD5E1] hover:shadow-[0_10px_24px_-6px_rgb(15_23_42_/_0.07),_0_2px_6px_-1px_rgb(15_23_42_/_0.03)]",
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 px-6 pt-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm leading-relaxed text-[#64748B]", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[#EEF2F6] px-6 py-4",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
