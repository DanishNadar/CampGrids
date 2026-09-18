/* The single source of truth for how MSI transactional email looks.
 *
 * Every value here is lifted from the real design tokens in styles.css rather than
 * invented, so an email and the web application cannot drift apart. If a token
 * changes in styles.css, change it here and rebuild.
 *
 * Nothing in this file is a template. Templates compose the components in
 * ./components, and both read their colors and type from here.
 */

export const brand = {
  /* Identity. MSI is the organization and leads; the portal name is secondary, so
     an email reads as coming from the museum rather than from one internal tool. */
  organization: 'Museum of Science and Industry',
  organizationShort: 'MSI',
  portal: 'Camp Grids Staff Portal',
  addressLines: ['5700 S DuSable Lake Shore Dr', 'Chicago, IL 60637'],

  /* The logo must be an absolute https URL: email clients cannot resolve a relative
     path, and Gmail and Outlook both refuse a data: URI. Served from the repository
     itself, which is public. The source mark is 524x601, so the rendered box keeps
     that ratio instead of squashing it into a square. */
  logo: {
    url: 'https://raw.githubusercontent.com/DanishNadar/CampGrids/main/assets/MSI_Logo.png',
    width: 46,
    height: 53,
    alt: 'Museum of Science and Industry'
  },

  /* styles.css tokens, verbatim. */
  color: {
    accent: '#FE5000',        // --msi-orange-021, Pantone Orange 021
    accentStrong: '#b33a00',  // --accentStrong, readable as text on white
    accentSoft: '#fff1e9',    // --accentSoft
    accentWash: '#fff7ed',    // --accentWash
    accentLine: '#f4aa87',    // --accentLine
    accentDivider: '#fee2d5', // --accentDivider
    ink: '#172033',           // --ink
    muted: '#334155',         // --muted
    paper: '#ffffff',         // --paper
    page: '#f1f5f9',          // --page
    rule: '#e2e8f0',
    onAccent: '#ffffff'
  },

  /* Web fonts do not load in most clients, so every stack ends in a real fallback
     and the design never depends on the first choice arriving. */
  font: {
    heading: "'Space Grotesk',Arial,Helvetica,sans-serif",
    body: "'DM Sans',Arial,Helvetica,sans-serif",
    mono: "Consolas,'Courier New',monospace"
  },

  layout: {
    width: 640,   // inside the 600-700px the request asks for
    gutter: 40,
    gutterSmall: 24
  }
};

/* White on the brand orange measures 3.3:1. That clears WCAG AA for large text and
 * fails it for body copy, which is why the orange band carries only the wordmark and
 * every paragraph sits on white. Orange as *text* uses accentStrong at 5.96:1.
 * These two helpers exist so a template cannot quietly get that wrong.
 */
export const onAccentHeading = (size = 22) => (
  `font-family:${brand.font.heading}; font-size:${size}px; font-weight:700; color:${brand.color.onAccent};`
);
export const accentText = (size = 12) => (
  `font-family:${brand.font.body}; font-size:${size}px; font-weight:700; color:${brand.color.accentStrong};`
);

/* Escapes text destined for HTML. Email bodies carry addresses and names that come
 * from an admin's keyboard, so nothing interpolated is trusted. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
