"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

interface LogoProps {
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

export function Logo({ width, height, className, priority = false, alt = "DRC Logo" }: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to a transparent placeholder or a base variant during SSR to avoid mismatch
  if (!mounted) {
    return <div style={{ width, height }} className={className} />;
  }

  // Ensure we use the correct logo variant based on theme
  const src = theme === "light" ? "/logo.png" : "/logo-white.png";

  return <Image src={src} alt={alt} width={width} height={height} className={className} priority={priority} />;
}
