# DRC Digital Ecosystem — Redesign Blueprint v1.0
**Phase 1: Architecture & Creative Strategy**
**Date:** 2026-04-21
**Engineer:** Staff Frontend Engineer

---

## 1. AUDIT SUMMARY

| Item | Finding |
|------|---------|
| **Framework** | Next.js 16.2.3 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4 (CSS-native config, no `tailwind.config.ts`) |
| **Animation** | Framer Motion 12.38.0 already installed |
| **Fonts** | Geist Sans + Geist Mono via `next/font/google` |
| **State** | AuthContext, ThemeContext (dark/light), LanguageContext (en/ar + RTL) |
| **Public Routes** | `/` `/about` `/projects` `/workshops` `/events` `/team` `/join` |
| **Dashboard** | Isolated under `/dashboard/*` — **untouched by this redesign** |
| **Existing Assets** | `PixelDrone.tsx` (SVG sprite, 100x68px, scroll-linked), glass/card system in `globals.css` |
| **i18n** | Robust inline translation map (~1,168 lines, Arabic keys present) |
| **Homepage** | Monolithic `page.tsx` (~1,595 lines). Must be decomposed. |

**Constraint Checklist**
- [x] APIs remain intact — all data hooks preserved
- [x] Auth routing untouched
- [x] RTL/Bilingual infrastructure already exists
- [x] Tailwind v4 compatible — no legacy config to migrate

---

## 2. PREMIUM COLOR PALETTE & TYPOGRAPHY SYSTEM

### 2.1 Design Philosophy
Move from "startup dark mode" to **tactical engineering aesthetic**. The palette must feel like a flight control interface — high contrast where it matters, subdued where it doesn't. Deeper blacks, sharper teals, and a controlled use of signal colors.

### 2.2 Color Tokens (CSS Custom Properties)

| Token | Dark Value | Light Value | Usage |
|-------|-----------|-------------|-------|
| `--bg-base` | `#01040a` | `#f6f8fc` | Deepest background |
| `--bg-surface` | `#060d18` | `#eef2f9` | Cards, panels |
| `--bg-elevated` | `#0a1525` | `#e4eaf5` | Hover states, menus |
| `--fg-primary` | `#e8ecf4` | `#0a1525` | Headings, primary text |
| `--fg-secondary` | `#8a96ab` | `#4a5568` | Body, descriptions |
| `--fg-muted` | `#4a5568` | `#8a96ab` | Meta, captions |
| `--teal` | `#00d9ac` | `#009d7c` | Primary action, drone LED, links |
| `--teal-dim` | `#009d7c` | `#007a60` | Hover, secondary teal |
| `--teal-glow` | `rgba(0,217,172,0.15)` | `rgba(0,157,124,0.12)` | Shadows, borders |
| `--cobalt` | `#00249c` | `#00249c` | Brand anchor, rarely used directly |
| `--cobalt-light` | `#1a3fb8` | `#1a3fb8` | Gradients only |
| `--signal-amber` | `#f59e0b` | `#d97706` | Warnings, live indicators |
| `--signal-red` | `#ef4444` | `#dc2626` | Errors, critical alerts |
| `--steel` | `#94a3b8` | `#64748b` | Technical labels, data readouts |
| `--grid-line` | `rgba(0,217,172,0.04)` | `rgba(0,36,156,0.05)` | Background grid |
| `--border-subtle` | `rgba(0,217,172,0.08)` | `rgba(0,36,156,0.10)` | Card borders |
| `--border-active` | `rgba(0,217,172,0.25)` | `rgba(0,36,156,0.22)` | Focus, active |

**New Additions:**
- `--hud-line`: `rgba(0, 217, 172, 0.12)` — for the drone connection SVG paths
- `--prop-wash`: `rgba(0, 217, 172, 0.06)` — ambient glow behind drone

### 2.3 Typography Scale

| Role | Font | Size | Weight | Letter-Spacing | Line-Height |
|------|------|------|--------|----------------|-------------|
| Display | Geist Sans | `clamp(3rem, 8vw, 7rem)` | 800 | `-0.04em` | 0.95 |
| H1 | Geist Sans | `clamp(2.25rem, 5vw, 4rem)` | 700 | `-0.03em` | 1.05 |
| H2 | Geist Sans | `clamp(1.5rem, 3vw, 2.5rem)` | 600 | `-0.02em` | 1.15 |
| H3 | Geist Sans | `1.25rem` | 600 | `-0.01em` | 1.3 |
| Body | Geist Sans | `1rem` | 400 | `0` | 1.65 |
| Caption | Geist Sans | `0.875rem` | 400 | `0` | 1.5 |
| **Mono / HUD** | Geist Mono | `0.75rem` | 500 | `0.08em` | 1.4 |
| **Label** | Geist Mono | `0.6875rem` | 600 | `0.12em` | 1.2 |
| Stat Value | Geist Mono | `2.5rem` | 700 | `-0.02em` | 1 |
| Stat Label | Geist Mono | `0.6875rem` | 500 | `0.1em` | 1.2 |

**Rules:**
- All uppercase labels use Geist Mono with `letter-spacing: 0.12em`.
- Numerical data (stats, counters, telemetry) uses Geist Mono.
- Headings never exceed 2 lines; if they do, reduce size.
- Arabic text inherits the same scale but uses `line-height: 1.6` minimum.

### 2.4 Spacing Rhythm

- **Section padding:** `py-24 md:py-32 lg:py-40` (generous vertical breathing room)
- **Container:** `max-w-7xl mx-auto px-6` (unchanged, works well)
- **Component gap:** `gap-8` default, `gap-12` for major splits
- **Border radius:** Reduce from `0.875rem` to `0.75rem` for a sharper, more engineered feel. Buttons remain `9999px` (pill).

---

## 3. CORE LAYOUT RHYTHM & UI COMPONENT STRATEGY

### 3.1 The "Drone Scroll" Narrative Architecture

The homepage is no longer a vertical list of sections. It is a **single scroll journey** where the drone is the persistent anchor. Each section is a "subsystem" that deploys from the drone as the user descends.

**Scroll Act Structure:**

```
Act 0: LAUNCHPAD    (Hero — drone centered, full scale, telemetry HUD)
Act 1: DEPLOYMENT   (Projects — drone scales to 0.6x, projects "peel" from right wing)
Act 2: MODULES      (Workshops — drone rotates 15°, workshop cards emerge from underbody)
Act 3: ARRAY        (Events — drone shifts left, event timeline arcs from nose)
Act 4: NETWORK      (Team — drone becomes central node, team orbiting dots connect)
Act 5: LANDING      (CTA / Footer — drone settles, minimal HUD)
```

### 3.2 Layout Primitives

**A. The Sticky Stage (`ScrollStage`)**
A full-viewport sticky container that holds the drone and the active subsystem. Content scrolls *over* or *beside* it, but the drone remains visually present.

```
<section class="h-[400vh] relative">
  <div class="sticky top-0 h-screen w-full overflow-hidden">
    <!-- Drone SVG + connection lines + active subsystem -->
  </div>
</section>
```

**B. The HUD Frame**
A persistent top/bottom overlay inside the sticky stage:
- **Top-left:** Section label (Mono, uppercase)
- **Top-right:** Scroll progress bar (thin, teal)
- **Bottom-left:** Telemetry readout (fake but evocative data: altitude, battery, signal)
- **Bottom-right:** Language / Theme toggles (moved from nav for immersion)

**C. Connection Lines (SVG)**
Bezier paths drawn from the drone's hardpoints to the active content cards. Stroke uses `stroke-dasharray` + `stroke-dashoffset` animated via `useTransform(scrollYProgress, [0,1], [totalLength, 0])`.

### 3.3 Component Inventory (New / Refactored)

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `Navigation` | **Refactor** | Simplify to minimal top bar. Remove mobile hamburger animation bloat. Keep glass on scroll. |
| `Footer` | **Keep** | Minor style updates to match new tokens. |
| `PixelDrone` | **Evolve** | Upgrade to `DroneAnchor.tsx`. Add hardpoint coordinates (wingtips, nose, underbelly, tail). Accept `scale`, `rotate`, `x`, `y` as motion props. |
| `ScrollStage` | **New** | Orchestrates the sticky viewport, drone position, and connection lines. |
| `ConnectionLine` | **New** | SVG `<path>` with animated `stroke-dashoffset`. Props: `start` (hardpoint), `end` (card ref), `progress`. |
| `SubsystemDeploy` | **New** | Wrapper that handles the "peel off" animation for a group of cards. Uses `useScroll` + `useTransform`. |
| `HeroDock` | **New** | Act 0. Full-screen telemetry HUD, big typography, CTA pills. |
| `ProjectsBay` | **New** | Act 1. 3 project cards that slide in from right, connected to drone wing. |
| `WorkshopsModule` | **New** | Act 2. Vertical stack of workshop cards that "unfold" from drone underbelly. |
| `EventsArray` | **New** | Act 3. Horizontal timeline arc from drone nose. |
| `TeamOrbit` | **New** | Act 4. Central drone node with orbiting team avatars. |
| `LandingCTA` | **New** | Act 5. Minimal, drone settles, final call to action. |
| `HUDLabel` | **New** | Mono uppercase label with decorative bracket `[  SECTION NAME  ]`. |
| `TelemetryBar` | **New** | Fake drone stats (ALT, SIG, BAT) for atmosphere. |
| `GlassCard` | **Refactor** | Update to new radius, border colors, and add subtle top highlight line. |

### 3.4 Mobile Strategy

- **Below `md`:** The sticky stage is disabled. Sections become standard flow.
- **Drone:** Appears as a small floating icon (64px) in the bottom-right corner, subtly bobbing. It does NOT try to do complex SVG lines on mobile.
- **Animations:** Reduced to `fade-up` + `scale` transforms. No connection lines.
- **RTL:** All directional transforms invert (`x: 100` becomes `x: -100`) via a `useDirection()` hook that checks `lang === 'ar'`.

### 3.5 RTL & Bilingual Safety

- All Framer Motion transforms must use a `getDirection()` helper:
  ```ts
  const dir = lang === 'ar' ? -1 : 1;
  // x: dir * 100
  ```
- Connection SVG paths must mirror their control points when `dir === -1`.
- `dir="rtl"` is already applied on `<html>` by `LanguageContext`. Tailwind v4 handles logical properties (`ms-` / `me-`) natively, but we will verify all `pl/pr` are converted to `ps/pe` in new components.

---

## 4. TECHNICAL EXECUTION PLAN — "DRONE SCROLL"

### 4.1 Animation Stack

| Tool | Purpose |
|------|---------|
| **Framer Motion** | Primary animation engine. `useScroll`, `useTransform`, `useSpring`, `motion` components. |
| **SVG (Native)** | Connection lines, drone body. No libraries. Manual path data + `stroke-dashoffset` animation. |
| **CSS Scroll-Timeline** | Fallback for simple parallax on browsers that support it (progressive enhancement). |
| **Tailwind** | Layout, spacing, color tokens. No animation classes for complex sequences — all delegated to Framer Motion for consistency. |

### 4.2 The Scroll Rig (Detailed)

We will use **section-relative scroll progress** rather than global page progress. This prevents drift and makes each act independently tunable.

```tsx
// Pseudo-architecture for ScrollStage
function ScrollStage({ acts }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  // Global progress mapped to acts
  const actIndex = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], [0, 1, 2, 3, 4, 5]);

  // Drone position per act
  const droneX = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], ['50%', '55%', '45%', '30%', '50%', '50%']);
  const droneY = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], ['50%', '45%', '40%', '45%', '50%', '55%']);
  const droneScale = useTransform(scrollYProgress, [0, 0.2, 1], [1, 0.6, 0.4]);
  const droneRotate = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0, -5, 10, 0]);

  return (
    <div ref={containerRef} className="relative" style={{ height: `${acts.length * 100}vh` }}>
      <div className="sticky top-0 h-screen">
        <motion.div style={{ x: droneX, y: droneY, scale: droneScale, rotate: droneRotate }}>
          <DroneAnchor />
        </motion.div>
        {/* Connection lines and subsystems rendered here based on actIndex */}
      </div>
    </div>
  );
}
```

### 4.3 Connection Line Math

For each subsystem, we calculate SVG paths from drone hardpoints to content cards.

**Hardpoint coordinates** (relative to drone SVG 100x68 viewBox):
- `nose`: `(10, 32)`
- `wingRight`: `(82, 10)`
- `wingLeft`: `(18, 10)`
- `underbelly`: `(50, 55)`
- `tail`: `(82, 32)`

**Path generation:**
```ts
function generatePath(start: Point, end: Point, dir: number): string {
  const controlOffset = 40 * dir;
  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;
}
```

**Animation:**
- Measure path length with `path.getTotalLength()` in a `useLayoutEffect`.
- Set `stroke-dasharray={length} stroke-dashoffset={length}` initially.
- Animate `stroke-dashoffset` to `0` via `useTransform` linked to the act's local scroll progress.

### 4.4 Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.05 |
| Animation frame rate | 60fps on MBP, 30fps minimum on mid-range mobile |

**Rules:**
- **No blur during scroll.** Backdrop-filter is ONLY on the static `Navigation` and `GlassCard` hover states. The sticky stage uses opaque backgrounds + gradients.
- **No layout thrashing.** All scroll-driven values are `transform` and `opacity` only.
- **SVG paths are pre-calculated.** No DOM measurement during the scroll loop.
- **`will-change: transform`** on the drone and active subsystem cards.
- **Reduced motion:** If `prefers-reduced-motion: reduce`, disable sticky stage and render standard sections.

### 4.5 File Structure (Proposed)

```
src/
  app/(public)/
    page.tsx                    # Orchestrator: ScrollStage + Acts
    layout.tsx                  # Unchanged
    about/
    projects/
    workshops/
    events/
    team/
    join/
  components/
    drone/
      DroneAnchor.tsx           # Evolved PixelDrone with hardpoints + motion props
      ConnectionLine.tsx        # SVG path with dashoffset animation
      TelemetryBar.tsx          # HUD stats
      HUDLabel.tsx              # Bracketed labels
    scroll/
      ScrollStage.tsx           # Sticky viewport + scroll rig
      SubsystemDeploy.tsx       # Wrapper for peel-off animations
    sections/
      HeroDock.tsx              # Act 0
      ProjectsBay.tsx           # Act 1
      WorkshopsModule.tsx       # Act 2
      EventsArray.tsx           # Act 3
      TeamOrbit.tsx             # Act 4
      LandingCTA.tsx            # Act 5
    ui/
      Navigation.tsx            # Refactored
      Footer.tsx                # Minor updates
      GlassCard.tsx             # Updated token styles
      Logo.tsx                  # Unchanged
```

### 4.6 Tailwind v4 Compatibility Notes

- Tailwind v4 uses `@theme inline` inside CSS. New tokens will be added there.
- Custom utility classes (e.g., `.glass`, `.gradient-text`) in `globals.css` are preserved and updated with new token values.
- No `tailwind.config.ts` will be created — it breaks v4.

### 4.7 Data Contract Preservation

All existing API calls in the current `page.tsx` will be moved into a `useHomeData()` hook. The new section components receive plain props — no component is allowed to call the API directly except the hook.

| Data Slice | Consumer |
|------------|----------|
| `workshops` | `WorkshopsModule` |
| `projects` | `ProjectsBay` |
| `announcements` | `HeroDock` (kicker) |
| `events` | `EventsArray` |
| `motm` | `TeamOrbit` |
| `homeStats` | `HeroDock` + `TelemetryBar` |
| `mediaItems` | `ProjectsBay` (thumbnails) |

---

## 5. ANTI-PATTERN CHECKLIST

Before any code is merged, verify:
- [ ] No generic glassmorphism on the sticky stage background.
- [ ] No purple gradients anywhere.
- [ ] No unoptimized 3D (Three.js, R3F, etc.).
- [ ] No `filter: blur()` during scroll animations.
- [ ] No AI-generated-stock-photo aesthetic.
- [ ] All directional animations are RTL-safe.
- [ ] Mobile does not attempt complex SVG connections.
- [ ] Dashboard routes and API endpoints are untouched.

---

## 6. APPROVAL GATE

**This blueprint stops here.** 

Upon approval, Phase 2 execution will proceed in this order:
1. Update `globals.css` with new tokens.
2. Build `DroneAnchor`, `ScrollStage`, and `ConnectionLine`.
3. Build `HeroDock` and wire it into the scroll rig.
4. Sequentially add `ProjectsBay`, `WorkshopsModule`, `EventsArray`, `TeamOrbit`, `LandingCTA`.
5. Refactor `Navigation` and `Footer`.
6. Mobile pass + RTL verification.
7. Performance audit (Lighthouse + manual frame check).

**Ready for your review, Sir.**
