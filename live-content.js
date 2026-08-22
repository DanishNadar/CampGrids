/* Applies MSI-admin managed navigation and dropdown options without a deploy.
   Realtime subscriptions make the changes appear during an open session when
   Supabase Realtime is enabled for these two tables. */
(() => {
  if (!window.CampGridsApp?.configured()) return;
  const client = window.CampGridsApp.getClient();

  async function renderManagedNavigation() {
    const tabs = document.querySelector('.siteNavTabs');
    if (!tabs) return;
    const { data, error } = await client
      .from('navigation_items')
      .select('id, label, href, page_id')
      .eq('location', 'primary')
      .eq('is_visible', true)
      .order('position');
    if (error) return;
    tabs.querySelectorAll('[data-live-nav]').forEach((node) => node.remove());
    data.forEach((item) => {
      const link = document.createElement('a');
      link.className = 'navLink liveNavLink';
      link.dataset.liveNav = item.id;
      link.href = item.page_id ? `page.html?slug=${encodeURIComponent(item.href)}` : item.href;
      const label = document.createElement('span');
      label.className = 'navLabel';
      label.textContent = item.label;
      link.appendChild(label);
      tabs.appendChild(link);
    });
  }

  async function renderManagedDropdowns() {
    const controls = [...document.querySelectorAll('select[data-dropdown-group][data-live-dropdown="true"]')];
    if (!controls.length) return;
    const keys = [...new Set(controls.map((control) => control.dataset.dropdownGroup))];
    const { data, error } = await client
      .from('dropdown_options')
      .select('group_key, value, label')
      .in('group_key', keys)
      .eq('is_active', true)
      .order('position');
    if (error) return;
    controls.forEach((control) => {
      const selected = control.value;
      control.replaceChildren(new Option('Choose an option', ''));
      data.filter((option) => option.group_key === control.dataset.dropdownGroup).forEach((option) => {
        control.add(new Option(option.label, option.value, false, option.value === selected));
      });
    });
  }

  const refresh = () => Promise.all([renderManagedNavigation(), renderManagedDropdowns()]);
  window.CampGridsLiveContent = { refresh };
  refresh();
  client.channel('campgrids-live-content')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation_items' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dropdown_options' }, refresh)
    .subscribe();
})();
