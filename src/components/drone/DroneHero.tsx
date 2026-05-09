"use client";

import { motion } from "framer-motion";

export function DroneHero({ className = "" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 400 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient glow */}
      <defs>
        <radialGradient id="droneGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,229,184,0.12)" />
          <stop offset="50%" stopColor="rgba(0,229,184,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,229,184,0.25)" />
          <stop offset="50%" stopColor="rgba(0,229,184,0.08)" />
          <stop offset="100%" stopColor="rgba(0,229,184,0.25)" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(10,30,55,0.9)" />
          <stop offset="100%" stopColor="rgba(5,12,25,0.95)" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx="200" cy="140" rx="180" ry="120" fill="url(#droneGlow)" />

      {/* Connection lines to subsystems */}
      <motion.path
        d="M 60 140 L 120 140"
        stroke="rgba(0,229,184,0.15)"
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
      />
      <motion.path
        d="M 340 140 L 280 140"
        stroke="rgba(0,229,184,0.15)"
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
      />
      <motion.path
        d="M 200 60 L 200 100"
        stroke="rgba(0,229,184,0.15)"
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.7, ease: "easeInOut" }}
      />
      <motion.path
        d="M 200 220 L 200 180"
        stroke="rgba(0,229,184,0.15)"
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.7, ease: "easeInOut" }}
      />

      {/* Front-left arm */}
      <motion.path
        d="M 200 140 L 100 80"
        stroke="url(#armGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      />
      {/* Front-right arm */}
      <motion.path
        d="M 200 140 L 300 80"
        stroke="url(#armGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
      />
      {/* Rear-left arm */}
      <motion.path
        d="M 200 140 L 100 200"
        stroke="url(#armGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      {/* Rear-right arm */}
      <motion.path
        d="M 200 140 L 300 200"
        stroke="url(#armGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      />

      {/* Motors */}
      {[
        { cx: 100, cy: 80 },
        { cx: 300, cy: 80 },
        { cx: 100, cy: 200 },
        { cx: 300, cy: 200 },
      ].map((m, i) => (
        <motion.g key={i}>
          <circle cx={m.cx} cy={m.cy} r="14" fill="rgba(0,229,184,0.08)" stroke="rgba(0,229,184,0.2)" strokeWidth="1.5" />
          <motion.circle
            cx={m.cx} cy={m.cy} r="8"
            fill="rgba(0,229,184,0.15)"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.g>
      ))}

      {/* Propeller spin indicators */}
      {[
        { cx: 100, cy: 80 },
        { cx: 300, cy: 80 },
        { cx: 100, cy: 200 },
        { cx: 300, cy: 200 },
      ].map((m, i) => (
        <motion.ellipse
          key={`prop-${i}`}
          cx={m.cx} cy={m.cy}
          rx="22" ry="6"
          fill="none"
          stroke="rgba(0,229,184,0.12)"
          strokeWidth="1"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.15 + i * 0.02, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${m.cx}px ${m.cy}px` }}
        />
      ))}

      {/* Central body */}
      <motion.ellipse
        cx="200" cy="140"
        rx="55" ry="35"
        fill="url(#bodyGrad)"
        stroke="rgba(0,229,184,0.15)"
        strokeWidth="1.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "200px 140px" }}
      />

      {/* Top dome */}
      <motion.ellipse
        cx="200" cy="132"
        rx="35" ry="18"
        fill="rgba(0,229,184,0.04)"
        stroke="rgba(0,229,184,0.12)"
        strokeWidth="1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />

      {/* Camera gimbal */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <circle cx="200" cy="165" r="10" fill="rgba(5,12,25,0.9)" stroke="rgba(0,229,184,0.2)" strokeWidth="1" />
        <circle cx="200" cy="165" r="5" fill="rgba(0,229,184,0.2)" />
        <circle cx="200" cy="165" r="2.5" fill="#00e5b8" />
      </motion.g>

      {/* Status LEDs */}
      <motion.circle
        cx="175" cy="125" r="2.5"
        fill="#ff3355"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.circle
        cx="225" cy="125" r="2.5"
        fill="#00e5b8"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* Telemetry lines on body */}
      <motion.path
        d="M 170 140 L 230 140"
        stroke="rgba(0,229,184,0.1)"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
      />
      <motion.path
        d="M 175 148 L 225 148"
        stroke="rgba(0,229,184,0.08)"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
      />

      {/* Corner brackets */}
      {[
        { d: "M 155 120 L 155 110 L 165 110", cx: 155, cy: 110 },
        { d: "M 245 120 L 245 110 L 235 110", cx: 245, cy: 110 },
        { d: "M 155 160 L 155 170 L 165 170", cx: 155, cy: 170 },
        { d: "M 245 160 L 245 170 L 235 170", cx: 245, cy: 170 },
      ].map((b, i) => (
        <motion.path
          key={`bracket-${i}`}
          d={b.d}
          stroke="rgba(0,229,184,0.2)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
        />
      ))}
    </motion.svg>
  );
}
