# Design System Specification: The Ethereal Professional

## 1. Overview & Creative North Star
**Creative North Star: The Lucid Gallery**

This design system is a rejection of the "boxed-in" web. Instead of rigid containers and heavy borders, we treat the interface as a series of translucent, suspended planes within a light-filled space. It is designed to feel like high-end editorial software—airy, sophisticated, and profoundly professional.

By leveraging high-refraction glassmorphism, we create a "Lucid Gallery" effect where the UI doesn't sit *on* the background, but *within* it. We move beyond standard templates by using intentional white space, rhythmic asymmetry, and a focus on "tonal depth" rather than structural lines. The goal is a digital experience that feels as premium as a physical gallery space.

---

## 2. Colors & Surface Philosophy
The palette is rooted in soft whites and technical grays, punctuated by deep professional blues and muted lavender tones.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning or layout containment. Boundaries must be defined through:
1.  **Background Shifts:** Transitioning from `surface` (#f8f9ff) to `surface-container-low` (#f1f3fb).
2.  **Tonal Transitions:** Using the mesh gradient depth to naturally "edge" a component.
3.  **Refraction:** Letting the `backdrop-blur` of a glass layer define its own boundary against the mesh background.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass sheets. 
*   **Base Layer:** The multi-colored mesh gradient (utilizing `background`, `primary-fixed`, and `tertiary-fixed` as soft blur spots).
*   **Mid-Level (Sections):** Use `surface-container-low` with a 20% opacity and 32px backdrop-blur.
*   **Top-Level (Interactions/Cards):** Use `surface-container-lowest` (Pure White) at 60-80% opacity to create a "pop" of clarity.

### The Glass & Gradient Rule
Main CTAs and Hero sections should not be flat. Use a subtle linear gradient: `primary` (#305ea9) to `primary-container` (#7ca5f6) at a 135-degree angle. This provides a "visual soul" that flat hex codes cannot replicate.

---

## 3. Typography
We utilize a pairing of **Manrope** (Display/Headlines) and **Inter** (UI/Body) to balance editorial character with technical precision.

*   **Display & Headline (Manrope):** Large scales (`display-lg` at 3.5rem) should use `on-surface` (#2d333b) with tight letter-spacing (-0.02em). This creates an authoritative, "stamped" look against the soft glass backgrounds.
*   **Body & Labels (Inter):** These are the workhorses. Use `body-md` (0.875rem) for primary reading. Ensure `on-surface-variant` (#595f69) is used for secondary text to maintain the "airy" feel without losing legibility.
*   **Hierarchy Tip:** Use extreme scale contrast. A `display-md` headline paired with a `label-md` uppercase tag creates a premium, high-fashion layout feel.

---

## 4. Elevation & Depth
In this system, depth is a feeling, not a shadow.

### The Layering Principle
Stacking containers defines importance. 
*   **Level 0:** Mesh Gradient Background.
*   **Level 1:** `surface-container` (The "Main" Work Area).
*   **Level 2:** `surface-container-lowest` (The "Active" Card).

### Ambient Shadows
When a floating effect is required (e.g., a Modal or Hover state), use a "tinted" shadow. Instead of `#000`, use `on-surface` (#2d333b) at 4% alpha with a 40px blur and 10px Y-offset. It should feel like a soft glow of occlusion, not a drop shadow.

### The "Ghost Border" Fallback
If a border is required for accessibility, use the "Ghost Border": `outline-variant` (#acb2bd) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), white text, `xl` (1.5rem) corner radius.
*   **Secondary:** Glass effect. `surface-container-lowest` at 40% opacity, 12px backdrop-blur, and a 1px white border at 30% opacity.
*   **States:** On hover, increase the `backdrop-blur` intensity rather than darkening the color.

### Cards & Lists
*   **The No-Divider Rule:** Forbid horizontal lines between list items. Use 16px of `body-lg` vertical spacing or a 4px `surface-container-high` background shift on hover.
*   **Nesting:** Cards should use `xl` (1.5rem) radius to feel approachable and soft.

### Input Fields
*   **Style:** Minimalist glass. A background of `surface-container-low` at 50% opacity.
*   **Focus:** The border should transition from the "Ghost Border" to a 1px solid `primary` (#305ea9) to signal intent.

### Chips
*   **Selection:** Use `secondary-container` (#d7e3f8) with `full` (9999px) radius. No shadow, just a subtle tonal shift from the background.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align a headline to the far left and the body text to a narrow column on the right. High-end design thrives on "white space as a feature."
*   **Use High Blur:** Always keep backdrop-blur values between 20px and 40px. Anything lower feels "dirty" rather than "glassy."
*   **Check Contrast:** Ensure that `on-surface` text on glass layers meets WCAG AA standards, especially over mesh gradients.

### Don’t:
*   **No Pure Black:** Never use #000000. Use `on-primary-fixed` (#000617) for the deepest blacks to maintain the blue-toned sophistication.
*   **No Sharp Corners:** Avoid the `none` and `sm` roundedness scales unless for technical data tables. This system lives in `lg` and `xl`.
*   **No Clutter:** If a screen feels busy, remove a container. Use the background's negative space to separate ideas.