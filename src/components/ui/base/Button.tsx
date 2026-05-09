"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  asChild?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: "btn-primary text-black",
  secondary: "btn-secondary text-foreground",
  ghost: "hover:bg-surface-elevated text-muted hover:text-foreground",
  danger: "bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20",
  outline: "border border-border bg-transparent text-foreground hover:bg-surface-elevated hover:border-border-highlight",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-8 py-3.5 text-base rounded-full gap-2.5 font-semibold",
  icon: "p-2 rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, className = "", disabled, asChild, ...props }, ref) => {
    const Component = asChild ? motion.span : motion.button;
    
    const content = (
      <>
        {isLoading && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Loader2 className="animate-spin" size={size === "sm" ? 14 : 18} />
          </motion.span>
        )}
        
        <span className={`inline-flex items-center gap-inherit ${isLoading ? "opacity-0" : "opacity-100"}`}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </>
    );

    const commonClasses = `
      relative inline-flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return (
        <Component
          ref={ref as any}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className={commonClasses}
          {...(props as any)}
        >
          {React.cloneElement(child, {
            className: `flex items-center gap-inherit w-full h-full justify-center ${child.props.className || ""}`
          })}
        </Component>
      );
    }

    return (
      <Component
        ref={ref as any}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        disabled={disabled || isLoading}
        className={commonClasses}
        {...(props as any)}
      >
        {content}
      </Component>
    );
  }
);

Button.displayName = "Button";
