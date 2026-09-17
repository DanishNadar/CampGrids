/* The public page for one partner organisation's Grid curriculum.

   A partner is a company that works with MSI to assemble its own curriculum out of
   the Mother Grid. This page presents that selection: the belts it covers, the
   categories inside each belt, and every activity with its links.

   It reads a single database function, partner_page(slug), which is executable by
   anon. That matters because a partner shares this link with schools and families
   who have no CampGrids account. The function returns nothing for an unpublished
   partner, so a draft cannot leak by guessing its address. */
(() => {
  const host = document.getElementById('partnerPage');
  if (!host) return;
  const app = window.CampGridsApp;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const beltRows = [['WT', 'White'], ['YW', 'Yellow'], ['OR', 'Orange'], ['GN', 'Green'], ['BU', 'Blue'], ['PL', 'Purple'], ['BN', 'Brown'], ['BK', 'Black']];
  const beltName = (code) => (beltRows.find(([entry]) => entry === code) || [code, code])[1];

  function panel(eyebrow, heading, detail) {
    return `<section class="loadingState"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(heading)}</h1>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<p><a class="quickLink qlBlue" href="index.html">Back to CampGrids</a></p></section>`;
  }

  /* Only links that actually point somewhere on the web are rendered. A cell may
     legitimately carry a project with no link at all, and a javascript: or data: URL
     in the sheet must never become a clickable anchor on a public page. */
  function safeUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function projectLinks(project) {
    const instructions = safeUrl(project.instructions_url);
    const video = safeUrl(project.video_url);
    const links = [];
    if (instructions) links.push(`<a class="partnerLink" href="${escapeHtml(instructions)}" target="_blank" rel="noopener noreferrer">Instructions</a>`);
    if (video) links.push(`<a class="partnerLink" href="${escapeHtml(video)}" target="_blank" rel="noopener noreferrer">Video</a>`);
    return links.length ? `<span class="partnerLinkRow">${links.join('')}</span>` : '<span class="partnerNoLink">In-person activity</span>';
  }

  function activityList(cell) {
    const projects = Array.isArray(cell.projects) ? cell.projects : [];
    if (!projects.length) {
      const single = safeUrl(cell.resource_url);
      return `<li><span class="partnerActivityName">${escapeHtml(cell.title)}</span>${single ? `<span class="partnerLinkRow"><a class="partnerLink" href="${escapeHtml(single)}" target="_blank" rel="noopener noreferrer">Open</a></span>` : ''}</li>`;
    }
    return projects.map((project) => `<li><span class="partnerActivityName">${escapeHtml(project.name)}</span>${projectLinks(project)}</li>`).join('');
  }

  /* One block per belt, in progression order, with the categories inside it. The
     belt is the unit a family recognises, so it leads; the workbook's own belt
     colours carry over from the Grid so the two read as the same curriculum. */
  function beltSections(cells) {
    const byBelt = new Map();
    cells.forEach((cell) => {
      if (!byBelt.has(cell.belt_code)) byBelt.set(cell.belt_code, []);
      byBelt.get(cell.belt_code).push(cell);
    });

    return beltRows
      .filter(([code]) => byBelt.has(code))
      .map(([code, name]) => {
        const group = byBelt.get(code).slice().sort((a, b) => a.column_number - b.column_number);
        const activities = group.reduce((sum, cell) => sum + (Array.isArray(cell.projects) && cell.projects.length ? cell.projects.length : 1), 0);
        const categories = group.map((cell) => `<article class="partnerCategory">
            <h3>${escapeHtml(cell.category || cell.title)}</h3>
            <ol class="partnerActivities">${activityList(cell)}</ol>
          </article>`).join('');
        return `<section class="partnerBelt">
          <header class="partnerBeltHeader belt${escapeHtml(code)}">
            <span class="partnerBeltChip">${escapeHtml(code)}</span>
            <div>
              <h2>${escapeHtml(name)} belt</h2>
              <p>${group.length} categor${group.length === 1 ? 'y' : 'ies'} &middot; ${activities} activit${activities === 1 ? 'y' : 'ies'}</p>
            </div>
          </header>
          <div class="partnerCategoryGrid">${categories}</div>
        </section>`;
      })
      .join('');
  }

  function render(partner) {
    const cells = Array.isArray(partner.cells) ? partner.cells : [];
    const belts = [...new Set(cells.map((cell) => cell.belt_code))];
    const categories = [...new Set(cells.map((cell) => cell.category).filter(Boolean))];
    const activities = cells.reduce((sum, cell) => sum + (Array.isArray(cell.projects) && cell.projects.length ? cell.projects.length : 1), 0);
    const site = safeUrl(partner.website);

    document.title = `${partner.name} | Grid curriculum | CampGrids`;

    const facts = [
      ['Belts', `${belts.length} of 8`],
      ['Categories', String(categories.length)],
      ['Activities', String(activities)]
    ].map(([label, value]) => `<div class="campFact"><span class="campFactLabel">${escapeHtml(label)}</span><span class="campFactValue">${escapeHtml(value)}</span></div>`).join('');

    const contact = [
      partner.contact_name ? `<div><dt>Programme contact</dt><dd>${escapeHtml(partner.contact_name)}</dd></div>` : '',
      partner.contact_email ? `<div><dt>Email</dt><dd><a href="mailto:${escapeHtml(partner.contact_email)}">${escapeHtml(partner.contact_email)}</a></dd></div>` : '',
      site ? `<div><dt>Website</dt><dd><a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a></dd></div>` : ''
    ].filter(Boolean).join('');

    host.innerHTML = `
      <header class="partnerHero">
        <p class="eyebrow">Grid curriculum partner</p>
        <h1>${escapeHtml(partner.name)}</h1>
        ${partner.focus ? `<p class="partnerFocus">${escapeHtml(partner.focus)}</p>` : ''}
        ${partner.summary ? `<p class="pageLede">${escapeHtml(partner.summary)}</p>` : ''}
        <div class="campFacts">${facts}</div>
      </header>

      <section class="pageSection">
        <p class="eyebrow">Built with MSI</p>
        <h2>How this curriculum works</h2>
        <p class="sectionText">Every activity below comes from the Camp Grids curriculum at the Museum of Science and Industry. Campers work up through the belts in order, and each belt spans several categories, so a camper builds breadth at one level before moving to the next.</p>
      </section>

      ${cells.length ? beltSections(cells) : '<section class="pageSection"><p class="emptyCopy">This curriculum has not been assembled yet. Check back shortly.</p></section>'}

      ${contact ? `<section class="pageSection partnerContact"><p class="eyebrow">Get in touch</p><h2>About this partnership</h2><dl class="partnerContactList">${contact}</dl></section>` : ''}

      <section class="pageSection">
        <p class="eyebrow">Keep exploring</p>
        <h2>More from CampGrids</h2>
        <div class="campNextLinks">
          <a class="quickLink qlBlue" href="campgrids.html">Open the full Grid</a>
          <a class="quickLink qlPurple" href="index.html">MSI camps</a>
        </div>
      </section>`;
  }

  async function load() {
    const slug = (new URLSearchParams(window.location.search).get('org') || '').trim().toLowerCase();
    if (!slug) {
      host.innerHTML = panel('Partner curriculum', 'No organisation was named.', 'This page needs an organisation in its address, for example partner.html?org=example-makers.');
      return;
    }
    if (!app?.configured()) {
      host.innerHTML = panel('Setup required', 'Connect Supabase to open this page.', app?.configurationMessage || '');
      return;
    }

    const { data, error } = await app.getClient().rpc('partner_page', { p_slug: slug });
    if (error) {
      // A missing function means the migration has not been applied on this project.
      const missing = String(error.code || '') === 'PGRST202' || /could not find the function/i.test(error.message || '');
      host.innerHTML = panel(
        'Partner curriculum',
        missing ? 'This site is not set up for partner pages yet.' : 'This curriculum could not be loaded.',
        missing ? 'Run supabase/migrations/20260917_partner_organizations.sql, then reload.' : error.message
      );
      return;
    }
    if (!data) {
      // Unpublished and non-existent are deliberately the same answer, so an address
      // cannot be probed to discover which drafts exist.
      host.innerHTML = panel('Partner curriculum', 'This curriculum is not published.', 'Check the address, or ask your MSI contact for the current link.');
      return;
    }
    render(data);
  }

  load().catch((error) => {
    host.innerHTML = panel('Partner curriculum', 'This curriculum could not be loaded.', error?.message || '');
  });
})();
