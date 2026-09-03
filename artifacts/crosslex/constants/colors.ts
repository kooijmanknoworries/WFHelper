/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#172227',
    tint: '#ef6a5b',

    // Core surfaces
    background: '#f6f4ef',
    foreground: '#172227',

    // Cards / elevated surfaces
    card: '#fffdf8',
    cardForeground: '#172227',

    // Primary action color (buttons, links, active states)
    primary: '#ef6a5b',
    primaryForeground: '#fffdf8',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e5edef',
    secondaryForeground: '#294047',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#edf1ed',
    mutedForeground: '#63757a',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f4d58f',
    accentForeground: '#694f18',

    // Destructive actions (delete, error states)
    destructive: '#c84f49',
    destructiveForeground: '#fffdf8',

    // Borders and input outlines
    border: '#d9e1df',
    input: '#d9e1df',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
