# Phase 1: UI Design Contract

## 1. Typography & Font System
- **Primary Font**: Extract from `~/Downloads/الهوية البصرية لنادي الدرونز والروبوت/ملف الهوية/الخط.png`. Must use this exact font for all Headings (H1-H6) and primary navigation.
- **Secondary/Body Font**: System defaults (Inter/Roboto/San Francisco) unless specified otherwise in the brand identity files.
- **Hierarchy**: Follow a fluid typography scale to ensure perfect responsiveness across mobile, tablet, and desktop.

## 2. Color Palette
- **Brand Colors**: Extract exact HEX codes from `~/Downloads/الهوية البصرية لنادي الدرونز والروبوت/ملف الهوية/الألوان.png`. 
- **Primary**: Dominant brand color.
- **Secondary**: Accent color for highlights.
- **Surface**: High-contrast dark or light background (depends on chosen mode, dark glassmorphism preferred for robotics/tech club feel).
- **Text**: Contrast compliant text colors against surfaces.

## 3. Brand Assets (Logos)
- Navigation Bar: Use `horizontal logo-white text.png` (for dark themes) or `horizontal logo-black text.png` (for light themes).
- Footer/Hero: Use dynamic variants (e.g., `logo.ai` extracted SVGs if possible or high-res PNGs like `logo white BG.png` / `logo without text.png`).
- Never stretch or distort the logos. Maintain exact aspect ratios.

## 4. Spacing & Layout
- **Grid System**: 12-column grid layout.
- **Container**: Max width 1280px (80rem) for desktop.
- **Spacing Scale**: Tailwind's default spacing scale (e.g., p-4, m-8, gap-6).
- **Symmetry & Breathing Room**: Generous padding around distinct sections (Hero, Overview, Hackathons, Alumni) to prevent feeling cramped.

## 5. Animation Protocol
- **Entrance**: Fade-in-up on scroll for all major section headers and staggered fade-ins for cards/items (using Framer Motion or GSAP).
- **Interactions**: Button hovers should feel magnetic or fluid. Smooth bezier curves (`cubic-bezier(0.4, 0, 0.2, 1)` or similar) for transitions.
- **Not AI Slop**: Avoid generic bouncy animations. Needs to feel heavy, precise, and tech/robotics focused.

## 6. Component Specs
### Navigation Bar
- Sticky/Fixed header with blur backdrop (glassmorphism).
- Contains primary logo and links: Overview, Hackathons, Alumni.
- Action Button: Prominent "Join Us" button.

### Cards (Alumni & Hackathons)
- Rounded corners aligned with CSS `--radius` variables.
- Soft box shadows on hover with slight upwards translation (`-translate-y-1`).
- Contains quote, name, and LinkedIn icon/link (for Alumni).

## 7. Consistency Rules
- strictly follow tailwind arbitrary values when applying brand hex codes until unified into `tailwind.config.js`.
- No inline styles. Everything processed through Tailwind classes.
