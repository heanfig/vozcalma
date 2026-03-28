# Design System Document

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** 

Unlike traditional utility apps that focus on speed and task completion, this system is designed to induce a physiological state of calm. It moves away from the "industrial" look of many wellness apps, opting instead for a high-end editorial feel that mimics a premium printed journal or a serene architectural space. 

We break the "template" look by rejecting rigid grids and harsh dividers. Instead, we use **intentional asymmetry**, wide-open "breathing spaces" (white space), and **tonal depth**. Elements should feel like they are floating in a soft, atmospheric environment, specifically curated to provide a sense of peace and cultural resonance for LATAM users who value warmth, fluidity, and human connection.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "Low-Stimulus" philosophy. Every color choice is intended to reduce cognitive load and visual fatigue.

### Tonal Hierarchy
- **Primary (#4f17ce):** Used sparingly for "Moments of Intention" (Main CTAs or active states). It is a deep, soulful violet that feels premium, not loud.
- **Tertiary (#2b5140):** A sophisticated Sage Green used for groundedness, specifically for nature-based meditations or progress indicators.
- **Surface & Backgrounds (#faf9fb):** Our canvas is a warm, "off-white" neutral that prevents the sterile, medical feel of pure #FFFFFF.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. 
Structural boundaries must be created through background shifts. For example, a content block using `surface-container-low` should sit directly on a `surface` background. The change in tone is enough to define the edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine, semi-transparent paper. 
- **Level 1 (Base):** `surface`
- **Level 2 (In-page sections):** `surface-container-low`
- **Level 3 (Interactive cards):** `surface-container-lowest` (pure white) to provide a soft, natural "pop."

### The "Glass & Gradient" Rule
To add "soul" to the interface, use Glassmorphism for floating controls (like audio players). Use a background blur of `12px` to `20px` combined with a semi-transparent `surface` color. For Hero areas, apply a subtle linear gradient from `primary` to `primary-container` at a 15-degree angle to mimic the natural shift of light at dusk.

---

## 3. Typography

The typographic strategy pairs the authority of a classical serif with the modern efficiency of a clean sans-serif.

*   **Display & Headlines (Noto Serif):** Used for titles and expressive moments. The serif provides a "literary" quality that feels intentional and slow.
    *   *Scale:* `display-lg` (3.5rem) to `headline-sm` (1.5rem).
*   **Interface & Body (Plus Jakarta Sans):** A contemporary sans-serif with an open aperture, ensuring high legibility for LATAM users across various device qualities.
    *   *Scale:* `title-lg` (1.375rem) for sub-headers; `body-md` (0.875rem) for general reading.

**Editorial Tip:** Use "Negative Leading." For large display headings, set the line height to 1.1 or 1.2 to create a compact, sophisticated "logotype" look for section titles.

---

## 4. Elevation & Depth

We convey importance through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card placed on a `surface-container-high` background creates a clear hierarchy without a single line being drawn.
*   **Ambient Shadows:** When an element must float (e.g., an active Audio Player), use a "Diffusion Shadow": 
    *   `blur: 40px`, `y: 10px`, `color: rgba(27, 28, 30, 0.06)`. 
    *   The shadow must be tinted with the `on-surface` color to feel like natural ambient light.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Rounded `full` (pill-shaped). Use `primary` background with `on-primary` text. No shadows; use a subtle scale-down (98%) on press.
- **Secondary:** `secondary-container` background. These should feel "recessive" compared to the primary action.
- **Tertiary:** Text-only with an underline that only appears on hover.

### Immersive Audio Player
- **Visuals:** Use a "Glass" container (`surface` color at 70% opacity with `24px` backdrop blur).
- **Controls:** The "Play" button should be the only element using the `primary-container` color. All other controls (skip, repeat) should use `on-surface-variant`.

### Clean Cards
- **Construction:** Use `xl` (1.5rem) corner radius. 
- **Separation:** **Never use dividers.** Use the Spacing Scale `8` (2rem) to separate internal card content. For internal groupings, use a `surface-variant` background at 50% opacity.

### Simple Chat Interface
- **Bubbles:** User messages in `primary-fixed`; system/guide messages in `surface-container-high`.
- **Typing Indicator:** A soft pulse animation (opacity 0.4 to 1.0) using the `tertiary` color.

### Input Fields
- **Style:** Background-only inputs using `surface-container-highest`. No bottom line or border. 
- **Focus:** Transition the background color to `primary-fixed` on focus.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins. For example, give a headline more top padding than bottom padding to create a "journal" feel.
*   **Do** use the `tertiary` (Sage Green) for success states instead of a standard "Success Green."
*   **Do** prioritize high-quality, desaturated photography or abstract organic shapes over icons.

### Don't
*   **Don't** use 1px dividers. If you feel you need one, use a 16px white-space gap instead.
*   **Don't** use pure black (#000000). Always use `on-surface` (#1b1c1e) for text.
*   **Don't** use "Alert Red" for errors. Use the `error` token (#ba1a1a) but wrap it in an `error-container` to soften the visual impact.
*   **Don't** crowd the screen. If a screen feels full, it is over-designed. Remove 20% of the elements.