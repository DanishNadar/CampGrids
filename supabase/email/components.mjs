/* Reusable pieces every MSI transactional email is built from.
 *
 * Deliberately plain functions returning table-based HTML with inline styles. That
 * is not nostalgia: Outlook on Windows renders through Word, which ignores most of a
 * stylesheet, drops flexbox and grid entirely, and will not apply padding or a
 * background to an anchor. Tables and inline styles are what actually survive.
 *
 * A template never writes a colour or a font stack of its own; it composes these.
 */

import { brand, escapeHtml } from './brand.mjs';

const { color: c, font: f, layout: L } = brand;

/* ------------------------------------------------------------------ layout ---- */

/* The outer shell: page background, the centred card, and the head. The media
 * query is the only stylesheet, and it is purely an enhancement - every rule it
 * contains has a sane inline default, so a client that ignores it still renders. */
export function EmailLayout({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  @media only screen and (max-width:${L.width + 40}px) {
    .msi-card { width:100% !important; border-radius:0 !important; }
    .msi-pad  { padding-left:${L.gutterSmall}px !important; padding-right:${L.gutterSmall}px !important; }
    .msi-h1   { font-size:25px !important; }
    .msi-btn  { display:block !important; width:100% !important; }
    .msi-col  { display:block !important; width:100% !important; padding:0 0 16px 0 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${c.page}; -webkit-font-smoothing:antialiased;">

${Preheader(preheader)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.page};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" class="msi-card" width="${L.width}" cellpadding="0" cellspacing="0" border="0" style="width:${L.width}px; max-width:${L.width}px; background-color:${c.paper}; border-radius:14px; overflow:hidden; box-shadow:0 10px 28px rgba(23,32,51,0.09);">
${body}
      </table>
      <div style="height:22px; line-height:22px; font-size:0;">&nbsp;</div>
    </td>
  </tr>
</table>

</body>
</html>
`;
}

/* The line an inbox shows beside the subject. The filler stops Gmail from pulling
 * the first body sentence in after it. */
function Preheader(text) {
  const filler = '&#847;&zwnj;&nbsp;'.repeat(12);
  return `<div style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${escapeHtml(text)} ${filler}</div>`;
}

/* ------------------------------------------------------------------ header ---- */

/* The brand band. MSI leads and the portal name sits under it, so the email reads
 * as coming from the museum rather than from one internal tool. Only this large
 * type sits on the orange, because white on #FE5000 is 3.3:1. */
export function EmailHeader() {
  const { logo } = brand;
  return `        <tr>
          <td class="msi-pad" style="background-color:${c.accent}; padding:28px ${L.gutter}px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" width="${logo.width}">
                  <img src="${logo.url}" width="${logo.width}" height="${logo.height}" alt="${escapeHtml(logo.alt)}"
                       style="display:block; width:${logo.width}px; height:${logo.height}px; border:0; outline:none; text-decoration:none; font-family:${f.body}; font-size:10px; line-height:12px; color:${c.onAccent};">
                </td>
                <td valign="middle" style="padding-left:16px;">
                  <div style="font-family:${f.heading}; font-size:21px; font-weight:700; line-height:25px; color:${c.onAccent}; letter-spacing:-0.01em; mso-line-height-rule:exactly;">${escapeHtml(brand.organizationShort)}</div>
                  <div style="font-family:${f.body}; font-size:11px; font-weight:500; line-height:16px; color:${c.onAccent}; letter-spacing:0.08em; text-transform:uppercase; mso-line-height-rule:exactly;">${escapeHtml(brand.portal)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

/* ------------------------------------------------------------------- title ---- */

export function EmailTitle({ eyebrow, heading, paragraphs = [] }) {
  const body = paragraphs.map((p) => (
    `            <p style="margin:14px 0 0 0; font-family:${f.body}; font-size:16px; font-weight:400; line-height:26px; color:${c.muted}; mso-line-height-rule:exactly;">${p}</p>`
  )).join('\n');
  return `        <tr>
          <td class="msi-pad" style="padding:36px ${L.gutter}px 0 ${L.gutter}px;">
            <div style="font-family:${f.body}; font-size:12px; font-weight:700; line-height:16px; color:${c.accentStrong}; letter-spacing:0.09em; text-transform:uppercase; mso-line-height-rule:exactly;">${escapeHtml(eyebrow)}</div>
            <h1 class="msi-h1" style="margin:10px 0 0 0; font-family:${f.heading}; font-size:30px; font-weight:700; line-height:36px; color:${c.ink}; letter-spacing:-0.035em; mso-line-height-rule:exactly;">${escapeHtml(heading)}</h1>
${body}
          </td>
        </tr>`;
}

/* ------------------------------------------------------------------ button ---- */

/* Outlook on Windows ignores padding and background on an anchor, so it gets a VML
 * rectangle instead. Exactly one of the two halves is ever rendered, and both point
 * at the same URL. The full address follows as text, because some clients strip a
 * button outright and a reader must still be able to act on the message. */
export function EmailButton({ href, label, note }) {
  const url = escapeHtml(href);
  return `        <tr>
          <td class="msi-pad" align="left" style="padding:26px ${L.gutter}px 0 ${L.gutter}px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="14%" strokecolor="${c.accent}" fillcolor="${c.accent}">
              <w:anchorlock/>
              <center style="color:${c.onAccent};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(label)}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <a class="msi-btn" href="${url}" style="display:inline-block; padding:16px 32px; border-radius:8px; background-color:${c.accent}; color:${c.onAccent}; font-family:${f.heading}; font-size:16px; font-weight:700; line-height:20px; text-align:center; text-decoration:none; mso-line-height-rule:exactly;">${escapeHtml(label)}</a>
            <!--<![endif]-->
${note ? `            <p style="margin:14px 0 0 0; font-family:${f.body}; font-size:13px; font-weight:400; line-height:20px; color:${c.muted}; mso-line-height-rule:exactly;">${escapeHtml(note)}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td class="msi-pad" style="padding:18px ${L.gutter}px 0 ${L.gutter}px;">
            <p style="margin:0; font-family:${f.body}; font-size:13px; font-weight:400; line-height:20px; color:${c.muted}; mso-line-height-rule:exactly;">Or paste this address into your browser:</p>
            <p style="margin:6px 0 0 0; font-family:${f.mono}; font-size:12px; line-height:19px; color:${c.accentStrong}; overflow-wrap:break-word; word-break:break-word; mso-line-height-rule:exactly;">${url}</p>
          </td>
        </tr>`;
}

/* ---------------------------------------------------------------- info box ---- */

/* A labelled facts strip. Columns stack on a narrow screen via .msi-col, and the
 * inline width keeps them side by side everywhere else. */
export function EmailInfoBox({ items }) {
  const cols = items.map((item, i) => (
    `                  <td class="msi-col" valign="top" width="${Math.floor(100 / items.length)}%" style="padding-right:${i === items.length - 1 ? 0 : 14}px;">
                    <div style="font-family:${f.body}; font-size:11px; font-weight:700; line-height:15px; color:${c.accentStrong}; letter-spacing:0.09em; text-transform:uppercase; mso-line-height-rule:exactly;">${escapeHtml(item.label)}</div>
                    <div style="margin-top:4px; font-family:${f.body}; font-size:14px; font-weight:500; line-height:21px; color:${c.ink}; overflow-wrap:break-word; word-break:break-word; mso-line-height-rule:exactly;">${escapeHtml(item.value)}</div>
                  </td>`
  )).join('\n');
  return `        <tr>
          <td class="msi-pad" style="padding:28px ${L.gutter}px 0 ${L.gutter}px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.accentSoft}; border:1px solid ${c.accentLine}; border-radius:12px;">
              <tr><td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${cols}
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>`;
}

/* --------------------------------------------------------------- steps list --- */

export function EmailSteps({ heading, steps, note }) {
  const rows = steps.map((s, i) => (
    `                  <tr>
                    <td valign="top" width="24" style="font-family:${f.body}; font-size:14px; font-weight:700; line-height:22px; color:${c.accentStrong};">${i + 1}.</td>
                    <td style="font-family:${f.body}; font-size:14px; font-weight:400; line-height:22px; color:${c.muted};">${escapeHtml(s)}</td>
                  </tr>`
  )).join('\n');
  return `        <tr>
          <td class="msi-pad" style="padding:26px ${L.gutter}px 0 ${L.gutter}px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${c.accentDivider}; border-radius:12px;">
              <tr><td style="padding:18px 20px;">
                <div style="font-family:${f.heading}; font-size:14px; font-weight:700; line-height:20px; color:${c.ink}; mso-line-height-rule:exactly;">${escapeHtml(heading)}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
${rows}
                </table>
${note ? `                <p style="margin:12px 0 0 0; font-family:${f.body}; font-size:13px; font-weight:400; line-height:20px; color:${c.muted}; mso-line-height-rule:exactly;">${escapeHtml(note)}</p>` : ''}
              </td></tr>
            </table>
          </td>
        </tr>`;
}

/* -------------------------------------------------------- security notice ----- */

export function EmailSecurityNotice({ heading, body }) {
  return `        <tr>
          <td class="msi-pad" style="padding:26px ${L.gutter}px 0 ${L.gutter}px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.accentWash}; border-left:4px solid ${c.accent}; border-radius:0 8px 8px 0;">
              <tr><td style="padding:16px 18px;">
                <div style="font-family:${f.heading}; font-size:14px; font-weight:700; line-height:20px; color:${c.ink}; mso-line-height-rule:exactly;">${escapeHtml(heading)}</div>
                <p style="margin:6px 0 0 0; font-family:${f.body}; font-size:14px; font-weight:400; line-height:21px; color:${c.muted}; mso-line-height-rule:exactly;">${body}</p>
              </td></tr>
            </table>
          </td>
        </tr>`;
}

/* ------------------------------------------------------------------ footer ---- */

export function EmailFooter({ reason }) {
  const year = new Date().getFullYear();
  return `        <tr>
          <td class="msi-pad" style="padding:32px ${L.gutter}px 0 ${L.gutter}px;">
            <div style="height:1px; background-color:${c.rule}; line-height:1px; font-size:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td class="msi-pad" style="padding:20px ${L.gutter}px 32px ${L.gutter}px;">
            <p style="margin:0; font-family:${f.body}; font-size:13px; font-weight:400; line-height:20px; color:${c.muted}; mso-line-height-rule:exactly;">${escapeHtml(reason)}</p>
            <p style="margin:14px 0 0 0; font-family:${f.body}; font-size:13px; font-weight:700; line-height:20px; color:${c.ink}; mso-line-height-rule:exactly;">${escapeHtml(brand.organization)}</p>
            <p style="margin:2px 0 0 0; font-family:${f.body}; font-size:13px; font-weight:400; line-height:20px; color:${c.muted}; mso-line-height-rule:exactly;">${brand.addressLines.map(escapeHtml).join(' &middot; ')}</p>
            <p style="margin:10px 0 0 0; font-family:${f.body}; font-size:12px; font-weight:400; line-height:18px; color:${c.muted}; mso-line-height-rule:exactly;">&copy; ${year} ${escapeHtml(brand.organization)}. ${escapeHtml(brand.organizationShort)} staff will never ask you for your password by email, phone, or chat.</p>
          </td>
        </tr>`;
}

/* --------------------------------------------------------------- spacer ------- */
export function EmailSpacer(height = 8) {
  return `        <tr><td style="height:${height}px; line-height:${height}px; font-size:0;">&nbsp;</td></tr>`;
}
