(() => {
  const host = document.getElementById('managedPage');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  async function render() {
    if (!window.CampGridsApp.configured()) {
      host.innerHTML = '<section class="loadingState"><p class="eyebrow">Setup required</p><h1>This managed page needs a Supabase connection.</h1></section>';
      return;
    }
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) throw new Error('This page does not have a page slug.');
    const { data, error } = await window.CampGridsApp.getClient().from('content_pages').select('title, summary, body, updated_at').eq('slug', slug).single();
    if (error || !data) throw new Error('This page is not published or could not be found.');
    document.title = `${data.title} | CampGrids`;
    const blocks = Array.isArray(data.body?.blocks) ? data.body.blocks : [];
    host.innerHTML = `<header class="pageHero managedHero"><div class="pageHeroCopy"><p class="eyebrow">MSI Camps</p><h1>${escapeHtml(data.title)}</h1>${data.summary ? `<p class="pageLede">${escapeHtml(data.summary)}</p>` : ''}</div></header><article class="managedArticle">${blocks.map((block) => block.type === 'heading' ? `<h2>${escapeHtml(block.text)}</h2>` : `<p>${escapeHtml(block.text)}</p>`).join('') || '<p>More information will be added soon.</p>'}</article>`;
  }
  render().catch((error) => { host.innerHTML = `<section class="loadingState"><p class="eyebrow">Page unavailable</p><h1>${escapeHtml(error.message)}</h1><a class="secondaryButton" href="index.html">Back to CampGrids</a></section>`; });
})();
