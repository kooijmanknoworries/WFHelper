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
    text: '#f7f9fc',
    tint: '#155DFC',

    // Core surfaces
    background: '#111a2e',
    foreground: '#f7f9fc',

    // Cards / elevated surfaces
    card: '#1e2938',
    cardForeground: '#f7f9fc',

    // Primary action color (buttons, links, active states)
    primary: '#155DFC',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#293648',
    secondaryForeground: '#f7f9fc',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#253244',
    mutedForeground: '#aeb9c8',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f28c28',
    accentForeground: '#111a2e',

    // Destructive actions (delete, error states)
    destructive: '#d75a5a',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#3a4759',
    input: '#3a4759',

    // Wordfeud-inspired tile and board colors
    tile: '#f4f2ed',
    tileForeground: '#17202d',
    board: '#182332',
    boardCell: '#2b3746',
    boardBorder: '#465465',
    doubleLetter: '#2188d3',
    doubleWord: '#d5565f',
    premiumForeground: '#ffffff',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
