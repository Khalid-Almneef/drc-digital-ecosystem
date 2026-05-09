"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export function GlowEffect({ className = "" }: { className?: string }) {
  const [mousePos, setMouseXPos] = useState({ x: -1000, y: -1000 });
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const checkMotion = () => setReducedMotion(motionQuery.matches);
    checkMobile();
    checkMotion();
    window.addEventListener("resize", checkMobile);
    motionQuery.addEventListener("change", checkMotion);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile || reducedMotion) return;
      setMouseXPos({ x: e.clientX, y: e.clientY });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (reducedMotion) return;
      const touch = e.touches[0];
      const newPoint = {
        id: Date.now(),
        x: touch.clientX,
        y: touch.clientY,
      };
      setTouchPoints((prev) => [...prev, newPoint]);
      
      // Remove point after animation
      setTimeout(() => {
        setTouchPoints((prev) => prev.filter((p) => p.id !== newPoint.id));
      }, 800);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);

    return () => {
      window.removeEventListener("resize", checkMobile);
      motionQuery.removeEventListener("change", checkMotion);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [isMobile, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}>
      {/* Desktop Mouse Glow */}
      {!isMobile && (
        <motion.div
          className="absolute h-[36rem] w-[36rem] rounded-full"
          style={{
            background: "radial-gradient(circle at center, var(--cursor-glow-primary) 0%, var(--cursor-glow-secondary) 22%, transparent 68%)",
            left: mousePos.x - 288,
            top: mousePos.y - 288,
            filter: "blur(26px)",
            opacity: 0.9,
          }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 180,
            mass: 0.7,
          }}
          animate={{ x: 0, y: 0 }}
        />
      )}

      {/* Mobile Touch Glows */}
      <AnimatePresence>
        {touchPoints.map((point) => (
          <motion.div
            key={point.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.4, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute h-32 w-32 rounded-full"
            style={{
              background: "radial-gradient(circle at center, var(--cursor-glow-primary) 0%, transparent 70%)",
              left: point.x - 64,
              top: point.y - 64,
              filter: "blur(6px)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
