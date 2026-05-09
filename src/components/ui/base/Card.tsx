"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type CardVariant = "glass" | "feature" | "soft" | "outline";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  interactive?: boolean;
  accentTop?: boolean;
}

const variants: Record<CardVariant, string> = {
  glass: "glass-card",
  feature: "card-feature",
  soft: "panel-soft",
  outline: "border border-border bg-transparent rounded-2xl",
};

export const Card = ({ variant = "glass", interactive = false, accentTop = false, children, className = "", ...props }: CardProps) => {
  const Component = interactive ? motion.div : "div";
  const motionProps = interactive ? {
    whileHover: { y: -4 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  } : {};

  return (
    <Component
      className={`
        ${variants[variant]}
        ${accentTop ? "card-accent-top" : ""}
        ${className}
      `}
      {...(motionProps as any)}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-b border-border/50 ${className}`}>{children}</div>
);

export const CardBody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-t border-border/50 bg-surface-elevated/30 ${className}`}>{children}</div>
);
