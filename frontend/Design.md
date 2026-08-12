---
name: Botanical Field Notebook
colors:
  surface: '#f0fdf3'
  surface-dim: '#d0ddd4'
  surface-bright: '#f0fdf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf7ed'
  surface-container: '#e4f1e7'
  surface-container-high: '#dfebe2'
  surface-container-highest: '#d9e6dc'
  on-surface: '#131e18'
  on-surface-variant: '#424842'
  inverse-surface: '#28332d'
  inverse-on-surface: '#e7f4ea'
  outline: '#727971'
  outline-variant: '#c2c8bf'
  surface-tint: '#46664b'
  primary: '#26442c'
  on-primary: '#ffffff'
  primary-container: '#3d5c42'
  on-primary-container: '#b0d3b2'
  inverse-primary: '#accfaf'
  secondary: '#83550e'
  on-secondary: '#ffffff'
  secondary-container: '#ffc072'
  on-secondary-container: '#794c04'
  tertiary: '#751f0e'
  on-tertiary: '#ffffff'
  tertiary-container: '#943622'
  on-tertiary-container: '#ffb9aa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8ecca'
  primary-fixed-dim: '#accfaf'
  on-primary-fixed: '#03210c'
  on-primary-fixed-variant: '#2f4e35'
  secondary-fixed: '#ffddb7'
  secondary-fixed-dim: '#f9bb6d'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdad3'
  tertiary-fixed-dim: '#ffb4a4'
  on-tertiary-fixed: '#3e0500'
  on-tertiary-fixed-variant: '#812816'
  background: '#f0fdf3'
  on-background: '#131e18'
  surface-variant: '#d9e6dc'
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Fraunces
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Fraunces
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Fraunces
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-margin: 32px
  gutter: 20px
---

## Brand & Style

This design system is rooted in the aesthetic of a naturalist’s field notebook—a blend of scientific precision and organic warmth. It captures the tactile sensation of heavy-weight paper, archival ink, and the meticulous documentation of the natural world.

The style is **Tactile Minimalism**. It avoids the artifice of digital-first gradients and blurs in favor of high-contrast, physical metaphors. The interface should feel like a specialized tool: quiet, dependable, and authoritative. Every element serves a purpose, mirroring the clarity required for botanical illustration. The emotional response is one of calm focus, academic curiosity, and timeless quality.

## Colors

The palette is derived from natural pigments and archival materials:

- **Ink (#1F2A24):** A deep, near-black green used for all primary text, ensuring maximum legibility against the paper background.
- **Paper (#F1EFE6):** The primary canvas. A warm, desaturated cream that reduces eye strain and provides a classic editorial feel.
- **Moss (#3D5C42):** Used for primary actions, success states, and completed milestones. It represents growth and stability.
- **Ochre (#B8823A):** Reserved for the "Current" state, focus rings, and active highlights. It serves as the visual "you are here" marker.
- **Rust (#A6432E):** The warning color. Used sparingly for errors, destructive actions, or failed validations.
- **Sage (#DCE3D5):** The utility color. Used for subtle card backgrounds, dividers, and secondary UI elements to provide structure without adding visual noise.

## Typography

Typography establishes a clear hierarchy between "Content" (Serif) and "Interface" (Sans).

- **Fraunces** is used for storytelling, headers, and titles. Its soft, characterful curves evoke historical publishing and hand-lettering. Use `display-lg` sparingly for major section entries.
- **Inter** handles all functional UI tasks: labels, buttons, input text, and data-heavy body copy. It provides a clean, modern counterpoint to the serif, ensuring the tool feels efficient.
- Use **Italic styles** for captions or scientific names (e.g., *Quercus robur*) to maintain the naturalist theme.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach on desktop to mimic the boundaries of a physical page, transitioning to a **Fluid Grid** on mobile.

- **Desktop:** 12-column grid with a maximum content width of 1280px. Margins are generous to emphasize the "quality" of the paper.
- **Mobile:** 4-column grid with 16px margins. 
- **Rhythm:** Use a 4px baseline grid. Spacing between related items (like a label and an input) should be `sm` (8px), while spacing between sections should be `xl` (48px).
- **Alignment:** Align text to the left. Avoid center-alignment for long-form reading to maintain the "notebook" structure.

## Elevation & Depth

This system avoids traditional box shadows to maintain a flat, printed aesthetic. Depth is communicated through **Tonal Layering** and **Precision Outlines**.

- **Level 0 (Base):** The `Paper` background.
- **Level 1 (Cards/Panels):** `Sage` surfaces with a 1px solid border in `Ink` (at 10% opacity). No shadow.
- **Active State:** Elements being interacted with do not lift; instead, they receive a 2px `Ochre` solid border or a "pressed" color shift.
- **Overlays:** Modals should use a solid `Ink` backdrop at 40% opacity with a sharp-edged `Paper` container.

## Shapes

The shape language is "Soft" yet disciplined. While physical paper and specimens have organic edges, the tools used to measure them (rulers, frames) are precise.

- **Standard UI (Buttons, Inputs):** 0.25rem (4px) corner radius. This provides just enough softness to feel approachable without losing the professional "tool" aesthetic.
- **Container Elements:** 0.5rem (8px) for larger cards or notebook-style panels.
- **The Ribbon:** The signature vertical stepper should have a "V" notch cut-out at the bottom, mimicking a fabric bookmark.

## Components

- **The Ribbon Stepper:** A vertical element anchored to the top of the viewport. Completed steps are `Moss`, the current step is a wider `Ochre` segment, and future steps are `Sage`.
- **Buttons:** 
  - *Primary:* Solid `Ink` background with `Paper` text. High contrast, no gradient.
  - *Secondary:* `Sage` background with `Ink` text.
  - *Ghost:* 1px `Ink` border (20% opacity) with `Ink` text.
- **Input Fields:** Rectangular with a 1px `Ink` border. On focus, the border thickens to 2px and changes to `Ochre`.
- **Cards:** Use the `Sage` color for the background. Content should be padded by `lg` (24px) units.
- **Progress Markers:** Small circular pips. Filled `Moss` for done, hollow `Ochre` ring for current.
- **Focus States:** All interactive elements must show a distinct 2px `Ochre` outline when focused via keyboard.