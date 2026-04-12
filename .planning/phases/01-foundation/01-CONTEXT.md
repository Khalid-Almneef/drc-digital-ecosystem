# Phase 1 Context

## Domain
Setting up the frontend environment and integrating the official visual identity into a robust design system to prepare the blank canvas for the main website implementation.

## Decisions

### 1. Framework & Stack
- **Decision:** Next.js + Tailwind CSS + Vanilla CSS (for fine-tuned custom animations where needed).
- **Rationale:** Strongly recommended for future-proofing the Phase 2/V2 internal portals (Role-Based Access Control) while ensuring excellent public facing performance and SEO.

### 2. Animation Tooling
- **Decision:** Framer Motion (integrated with React/Next.js) or GSAP. The agent is authorized to pick the best fit based on the exact animation requirements.
- **Rationale:** Ensures fluid, high-performance, premium animations ("not AI slop") that differentiate the site significantly from standard templates.

### 3. Design System & Competitor Reference
- **Decision:** Completely custom design. Do NOT use any layout or style references from `ftcksu.com`.
- **Rationale:** `ftcksu.com` is a competitor. The objective is to build a demonstrably superior, entirely unique digital experience that surpasses them. 

## References
- Identity Assets Folder: `~/Downloads/الهوية البصرية لنادي الدرونز والروبوت/`

## Out of Scope
- Internal Portal features (deferred to V2).
