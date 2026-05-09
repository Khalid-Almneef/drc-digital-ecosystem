"use client";

import React from "react";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  success: "badge-success",
  warning: "badge-warning",
  error: "bg-red-400/10 border border-red-400/20 text-red-400",
  info: "bg-blue-400/10 border border-blue-400/20 text-blue-400",
};

export function Badge({ variant = "primary", children, className = "", dot }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
      {children}
    </span>
  );
}
