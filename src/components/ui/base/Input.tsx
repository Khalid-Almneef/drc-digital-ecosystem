"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, containerClassName = "", className = "", id, ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className="block px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-300">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`
              dashboard-field py-2.5 px-4 block w-full outline-none
              ${icon ? "ps-11" : ""}
              ${error ? "border-red-400/30 focus:border-red-400/50 focus:shadow-red-400/5" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="px-1 text-xs text-red-400 font-medium animate-in fade-in slide-in-from-top-1 duration-300">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
