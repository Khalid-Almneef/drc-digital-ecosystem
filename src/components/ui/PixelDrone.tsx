"use client";

import { useState } from "react";
import {
  motion,
  useAnimationControls,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

// ─── Palette ─────────────────────────────────────────────────────────────────
// Accent colors follow the user's theme via CSS vars. Chassis/structural
// colors stay fixed so the drone silhouette holds across light and dark mode.
const T   = "var(--primary)";        // primary (was teal)
const TB  = "var(--primary-bright)"; // bright primary highlight
const NAV = "var(--secondary-light)"; // front nav LED follows palette
const D   = "#060c18"; // deepest shadow
const B   = "#0f1928"; // body dark
const B2  = "#182c44"; // body mid
const B3  = "#1f3a5c"; // body light
const AX  = "#0b1626"; // arm / structural
const W   = "#071524"; // cockpit glass dark
const W2  = "#0d2a44"; // cockpit glass lighter

// ─── Propeller ───────────────────────────────────────────────────────────────
// cx/cy = SVG pixel center of the rotor hub
function Prop({ cx, cy, boost = false }: { cx: number; cy: number; boost?: boolean }) {
  const R = 13;
  const spin = boost ? 0.09 : 0.16;
  return (
    <g>
      {[16, 14, 12, 10, 8].map((hw, i) => (
        <rect
          key={i}
          x={cx - hw} y={cy - 2}
          width={hw * 2} height={4}
          fill={T} opacity={(0.03 + i * 0.025) * (boost ? 1.6 : 1)}
          shapeRendering="crispEdges"
        />
      ))}

      <motion.g
        animate={{ rotate: [0, 360] }}
        transition={{ duration: spin, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <rect x={cx - R} y={cy - 1.5} width={R * 2} height={3} fill={T} opacity={0.82} shapeRendering="crispEdges" />
        <rect x={cx - 1.5} y={cy - R} width={3} height={R * 2} fill={T} opacity={0.82} shapeRendering="crispEdges" />
      </motion.g>

      <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={B3} shapeRendering="crispEdges" />
      <rect x={cx - 2} y={cy - 2} width={4} height={4} fill={T} shapeRendering="crispEdges" />
      <rect x={cx - 1} y={cy - 1} width={2} height={2} fill={TB} shapeRendering="crispEdges" />

      <motion.rect
        x={cx - 8} y={cy + 3} width={16} height={6}
        fill={T} shapeRendering="crispEdges"
        animate={{ opacity: boost ? [0.16, 0.06, 0.16] : [0.07, 0.02, 0.07], y: [0, 3, 0] }}
        transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
      />
    </g>
  );
}

// ─── Drone body SVG ───────────────────────────────────────────────────────────
// 100 × 68 px canvas. Drone faces LEFT (camera/nose on left).
function DroneSVG({
  width = 100,
  height = 68,
  boost = false,
}: {
  width?: number;
  height?: number;
  boost?: boolean;
}) {
  return (
    <svg
      width={width} height={height}
      viewBox="0 0 100 68"
      style={{ imageRendering: "pixelated" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rotor shafts */}
      <rect x={15} y={13} width={6} height={10} fill={AX} shapeRendering="crispEdges" />
      <rect x={79} y={13} width={6} height={10} fill={AX} shapeRendering="crispEdges" />

      {/* Top arms */}
      <rect x={15} y={21} width={18} height={4} fill={AX} shapeRendering="crispEdges" />
      <rect x={67} y={21} width={18} height={4} fill={AX} shapeRendering="crispEdges" />

      {/* Hull */}
      <rect x={22} y={18} width={56} height={30} fill={D} shapeRendering="crispEdges" />
      <rect x={24} y={20} width={52} height={26} fill={B} shapeRendering="crispEdges" />
      <rect x={24} y={20} width={52} height={7}  fill={B2} shapeRendering="crispEdges" />
      <rect x={26} y={20} width={48} height={2}  fill={T} opacity={0.45} shapeRendering="crispEdges" />

      {/* Cockpit window */}
      <rect x={26} y={27} width={20} height={13} fill={W} shapeRendering="crispEdges" />
      <rect x={28} y={29} width={10} height={7}  fill={W2} shapeRendering="crispEdges" />
      <rect x={28} y={29} width={5}  height={4}  fill="#0d3650" shapeRendering="crispEdges" />

      {/* Mid-body panel lines */}
      <rect x={48} y={22} width={2} height={22} fill={B3} shapeRendering="crispEdges" />
      <rect x={54} y={22} width={2} height={22} fill={B3} shapeRendering="crispEdges" />
      <rect x={60} y={22} width={2} height={22} fill={B3} shapeRendering="crispEdges" />

      {/* Camera pod */}
      <rect x={10} y={26} width={16} height={12} fill={AX} shapeRendering="crispEdges" />
      <rect x={12} y={28} width={10} height={8}  fill={D}  shapeRendering="crispEdges" />
      <rect x={10} y={29} width={5}  height={6}  fill="#02080e" shapeRendering="crispEdges" />
      <rect x={11} y={30} width={3}  height={4}  fill="#020d18" shapeRendering="crispEdges" />
      <rect x={11} y={30} width={2}  height={2}  fill={T} opacity={0.55} shapeRendering="crispEdges" />

      {/* Rear engine nozzle */}
      <rect x={76} y={26} width={6} height={12} fill={AX} shapeRendering="crispEdges" />
      <rect x={78} y={28} width={4} height={8}  fill={D}  shapeRendering="crispEdges" />
      <motion.rect
        x={80} y={29} width={4} height={6}
        fill={T} shapeRendering="crispEdges"
        animate={{
          opacity: boost ? [1, 0.6, 1] : [0.7, 0.25, 0.7],
          scaleX: boost ? [1.2, 0.9, 1.2] : [1, 0.7, 1],
        }}
        transition={{ duration: boost ? 0.32 : 0.55, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "80px 32px" }}
      />
      <motion.rect
        x={82} y={30} width={6} height={4}
        fill={T} shapeRendering="crispEdges" opacity={0}
        animate={{
          opacity: [0, boost ? 0.55 : 0.25, 0],
          x: [0, boost ? 6 : 4, boost ? 12 : 8],
          scaleX: [1, 0.8, 0.4],
        }}
        transition={{ duration: boost ? 0.32 : 0.55, repeat: Infinity, ease: "easeOut" }}
        style={{ transformOrigin: "82px 32px" }}
      />

      {/* LEDs */}
      <motion.rect
        x={10} y={26} width={3} height={2}
        fill={NAV} shapeRendering="crispEdges"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <motion.rect
        x={78} y={26} width={2} height={2}
        fill="#ff3355" shapeRendering="crispEdges"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.rect
        x={44} y={18} width={4} height={2}
        fill={T} shapeRendering="crispEdges"
        animate={{ opacity: [1, 0.05, 1] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Landing gear */}
      <rect x={30} y={46} width={4}  height={10} fill={AX} shapeRendering="crispEdges" />
      <rect x={26} y={54} width={12} height={4}  fill={AX} shapeRendering="crispEdges" />
      <rect x={66} y={46} width={4}  height={10} fill={AX} shapeRendering="crispEdges" />
      <rect x={62} y={54} width={12} height={4}  fill={AX} shapeRendering="crispEdges" />
      <rect x={28} y={48} width={4}  height={4}  fill={B2} shapeRendering="crispEdges" />
      <rect x={68} y={48} width={4}  height={4}  fill={B2} shapeRendering="crispEdges" />

      {/* Propellers */}
      <Prop cx={18} cy={10} boost={boost} />
      <Prop cx={82} cy={10} boost={boost} />
    </svg>
  );
}

// ─── Floating, interactive drone ─────────────────────────────────────────────
export function PixelDrone() {
  const { scrollYProgress } = useScroll();
  const velocity = useVelocity(scrollYProgress);
  const smooth = useSpring(scrollYProgress, { stiffness: 45, damping: 18, restDelta: 0.001 });
  const droneY = useTransform(smooth, [0, 1], ["10vh", "82vh"]);
  const rawTilt = useTransform(velocity, [-0.5, 0, 0.5], [-14, 0, 14]);
  const tilt = useSpring(rawTilt, { stiffness: 70, damping: 22 });

  const rollControls = useAnimationControls();
  const [hovered, setHovered] = useState(false);
  const [rolling, setRolling] = useState(false);

  const handleTap = async () => {
    if (rolling) return;
    setRolling(true);
    await rollControls.start({
      rotate: 360,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    });
    rollControls.set({ rotate: 0 });
    setRolling(false);
  };

  const filter = hovered
    ? "brightness(1.18) drop-shadow(0 0 22px var(--cursor-glow-primary))"
    : "drop-shadow(0 0 12px var(--cursor-glow-primary))";

  return (
    <motion.div
      style={{ y: droneY, rotate: tilt }}
      className="fixed right-3 top-0 z-30 hidden xl:block select-none"
      aria-hidden="true"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          animate={rollControls}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          onTap={handleTap}
          role="button"
          tabIndex={0}
          aria-label="Pixel drone — click to barrel roll"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTap();
            }
          }}
          className="pointer-events-auto cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
          style={{ filter, transition: "filter 200ms ease" }}
        >
          <DroneSVG boost={hovered || rolling} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Static art — used inside the home hero card. Shares chassis art and palette
// but no scroll/click interaction (so it doesn't compete with the floating one).
export function PixelDroneArt({ large = false }: { large?: boolean }) {
  const w = large ? 360 : 160;
  const h = large ? 245 : 109;
  return (
    <div className={large ? "w-[300px] sm:w-[360px]" : "w-[160px]"}>
      <DroneSVG width={w} height={h} />
    </div>
  );
}
