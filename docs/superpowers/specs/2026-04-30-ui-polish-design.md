# UI Polish & Refinement — Design Spec
**Date:** 2026-04-30  
**Direction:** A — Polish & Refine (keep dark tech aesthetic, improve execution quality)

## Goal
Elevate the visual quality of the DRC Digital Ecosystem across all pages by tightening typography, deepening card surfaces, refining the sidebar active state, upgrading the palette picker, and polishing the public navigation. No layout changes — all improvements are additive surface-level refinements.

## 1. Typography — Space Grotesk
- Add Space Grotesk via `next/font/google` (self-hosted at build time, no external CDN call)
- Update `--font-geist-sans` CSS var to lead with Space Grotesk
- Add `letter-spacing: -0.03em` to `h1`, `-0.025em` to `h2`/`h3` in globals.css

## 2. Card Surfaces
- `StatCard.tsx`: icon container gets gradient fill + glow shadow (`color-mix(primary 16%, transparent)` background, `0 0 16px primary/10` shadow)
- `StatCard.tsx`: stat value changes from `text-foreground` to `text-primary font-extrabold`
- These improvements apply through `glass-card` (already strong) + targeted StatCard tweaks

## 3. Dashboard Sidebar Active State
- Left-edge indicator (`w-0.5 bg-primary`) gains `shadow-[0_0_8px_var(--primary)]` glow
- Active row background: flat `bg-primary/10` → gradient `linear-gradient(90deg, primary/15%, primary/5%)`
- Active icon: gets `text-primary` (already there)

## 4. Color Palette Picker
- Before the color inputs in `dashboard/profile/page.tsx`, add 4 preset swatch buttons
- Presets: DRC Default, Midnight Purple, Solar, Crimson
- Each swatch is a split gradient button (primary | secondary); clicking applies the preset via `setPalette()`

## 5. Public Hero Sections
- Globals.css already has grid overlay in `.public-site-bg::before` and radial gradients
- No separate hero changes needed — typography upgrade handles the visual uplift

## 6. Navigation Bar
- Logo: wrap in container with `bg-primary/10 border border-primary/25 rounded-xl` and glow shadow
- Active nav links: add `bg-primary/8 rounded-lg` pill background for active state (keep existing underline animation)
- Sign-in CTA: change from `variant="ghost"` to `variant="outline"` for more presence

## Files Changed
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Add Space Grotesk font import |
| `src/app/globals.css` | Font var, heading letter-spacing |
| `src/components/dashboard/Sidebar.tsx` | Active state glow + gradient |
| `src/components/dashboard/StatCard.tsx` | Icon glow, value color |
| `src/components/ui/Navigation.tsx` | Logo container, active pill, CTA |
| `src/app/dashboard/profile/page.tsx` | Preset palette swatches |
