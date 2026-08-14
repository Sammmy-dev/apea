---
name: APEA Institutional Verification System
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#44474e'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4e5e81'
  primary: '#031635'
  on-primary: '#ffffff'
  primary-container: '#1a2b4b'
  on-primary-container: '#8293b8'
  inverse-primary: '#b6c6ef'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#231400'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e2700'
  on-tertiary-container: '#b08d5b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b6c6ef'
  on-primary-fixed: '#081b3a'
  on-primary-fixed-variant: '#364768'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#e8c08a'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#5d4217'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 24px
  gutter: 16px
  touch-target-min: 48px
---

## Brand & Style
The design system for this B2B SaaS platform is rooted in the concepts of **security, speed, and absolute reliability**. Given its role in child-pickup verification, the UI must evoke an immediate sense of institutional trust and calm authority. 

The visual style is **High-Contrast Minimalism**. It intentionally avoids decorative trends like gradients, blurs, or shadows to ensure maximum legibility and zero visual distraction. The aesthetic borrows from modern fintech and healthcare interfaces—prioritizing clarity of information over stylistic flourish. Every element exists to facilitate a high-stakes workflow where errors are not an option.

- **Primary Persona:** School administrators (Desktop) and Guardians/Staff (Mobile).
- **Tone:** Professional, direct, and stable.
- **Visual Principles:** Hard edges (minimal rounding), generous whitespace to prevent cognitive overload, and a strictly functional use of color for status signaling.

## Colors
The palette is dominated by **Navy Blue (#1A2B4B)**, chosen for its psychological association with law enforcement and established institutions. 

- **Primary:** Navy Blue is used for primary actions, navigation headers, and authoritative text.
- **Surface & Neutrals:** We utilize a clinical grayscale. Backgrounds use a very light "off-white" gray (#F8FAFC) to reduce eye strain while maintaining high contrast against pure white cards. 
- **Borders:** A medium-light gray (#E2E8F0) is used for structural definition.
- **Status Colors:** These are highly saturated to ensure immediate recognition. Success Green is used for "Verified" states, Error Coral for "Unauthorized" or "Revoked" access, and Amber for "Pending" or "Requires Attention."

## Typography
This design system utilizes **Public Sans**, an institutional typeface designed for legibility and neutrality. The type scale is designed to be highly scanned rather than read linearly.

- **Weight Usage:** Only three weights are permitted: Regular (400) for body text, Medium (500) for labels, and SemiBold/Bold (600/700) for headlines and primary buttons.
- **Hierarchy:** Large titles are reserved for student names or verification status. Small, uppercase labels are used to categorize data (e.g., "GUARDIAN RELATIONSHIP," "PICKUP TIME").
- **Contrast:** Text should never be lighter than #475569 to ensure WCAG AA compliance against all background surfaces.

## Layout & Spacing
The system follows a strict **8px grid**. Because the platform is used in high-traffic school zones, touch targets are prioritized.

- **Mobile (Guardian/Staff):** Single column layout. All interactive elements (buttons, inputs) must be at least 48px in height. Margins are fixed at 24px to provide a "safe zone" for handheld use.
- **Desktop (Admin Portal):** A 12-column fixed grid (max-width 1440px). Sidebars are used for persistent navigation to ensure the main verification feed is always centered and unobstructed.
- **Density:** We employ "Generous Density." While the information is compact, the whitespace between different student records is large (32px+) to prevent "mis-tapping" a nearby record.

## Elevation & Depth
In alignment with the "Clean & Flat" directive, this design system **expressly forbids drop shadows**. Depth is communicated through:

- **Tonal Layering:** The main page background is #F8FAFC. Interactive "Cards" or content containers are pure white (#FFFFFF) with a 1px solid border (#E2E8F0).
- **Active States:** Instead of a shadow, an active or focused element is indicated by a 2px solid border in the Primary Navy color.
- **Disabled States:** Elements are dropped to 40% opacity with a gray fill, indicating lack of utility without changing the physical layout.

## Shapes
The shape language is "Soft-Square." We use a subtle **0.25rem (4px) radius** for most components. This provides a professional, modern look that is less "aggressive" than sharp corners but avoids the playfulness of highly rounded "pill" shapes. 

- **Photo Placeholders:** Student and Guardian photos must be perfectly square or slightly rounded (4px). Avoid circular masks, as square photos maximize the visible area of the person's face for faster verification.
- **Status Indicators:** Small square dots or colored side-bars on cards are used to denote status.

## Components

### Buttons
- **Primary:** Solid Navy (#1A2B4B) background, white text. Bold weight. No shadow.
- **Secondary:** White background, 1px Navy border, Navy text.
- **Destructive:** Solid Coral (#D32F2F) for "Revoke Access" or "Cancel" actions.

### Cards (Verification Records)
- **Structure:** White background, 1px border.
- **Layout:** Left-aligned student photo (64x64px), followed by Name and Grade. Right-aligned status badge.
- **Interaction:** On mobile, the entire card acts as a tap target to open the full verification detail.

### Input Fields
- **Style:** Rectangular with a 1px gray border. 
- **Focus State:** Border changes to 2px Navy Blue. Labels are always persistent above the field (never floating or disappearing) for clarity.

### Photo Placeholders
- **Visual:** High-contrast grayscale icons used when a photo is missing. Once uploaded, photos should be high-resolution and maintain a 1:1 aspect ratio.

### Status Badges
- **Design:** Rectangular with very slight rounding. High-contrast text on a light tinted background of the status color (e.g., Dark Green text on light mint background).