/* This file holds everything shared by every page: the external link list, the camp menu structure, the placeholder camp content, and the code that builds the top navigation bar. Individual pages load this file first, then load any extra script they need. */

/* Shared image slot used anywhere a camp page or gallery needs a photo that has not been supplied yet. */
const sitePlaceholderImage = 'assets/placeholder.jpg';

/* This list fills the quick link buttons on the CampGrids resources page. These are outside tools rather than pages of this site, so they stay a quick link strip and are deliberately not in the navigation bar. */
const externalLinks = [
  { label: 'Belts', href: 'https://docs.google.com/spreadsheets/d/13XSBDHuYkVl0Fgng4vzA6WdHMrDKTD67eLoiP7Y3z4E/edit?usp=sharing', colorClass: 'qlPurple' },
  { label: 'TinkerCAD Portal', href: 'http://www.tinkercad.com/joinclass/HQPGBBSGD', colorClass: 'qlTeal' },
  { label: 'Scratch Usernames', href: 'https://docs.google.com/spreadsheets/d/1Xmc2GbvR3rrxGoHHxbuT-zOhzrYbOokWfGLSPpNzNk0/edit?usp=sharing', colorClass: 'qlBlue' }
];

/* This is the camp list behind the "MSI Camps" tab. These are the camps run on museum premises, and there is one camp per entry. */
const msiCamps = [
  {
    id: 'mini-makers',
    name: 'Mini Makers',
    blurb: 'Short, playful sessions for the youngest campers, built around hands-on making.'
  },
  {
    id: 'young-makers',
    name: 'Young Makers',
    blurb: 'Longer projects where campers plan, build, test, and improve their own work.'
  },
  {
    id: 'fab-lab',
    name: 'Fab Lab',
    blurb: 'Digital fabrication camps using the lab machines, from laser cutting to 3D printing.'
  }
];

/* This is the camp list behind the "External Camps" tab. These are the partnership camps that run away from museum premises. The names are placeholders until the real partnership camps are known. */
const externalCamps = [
  { id: 'external-camp-1', name: 'Camp 1' },
  { id: 'external-camp-2', name: 'Camp 2' },
  { id: 'external-camp-3', name: 'Camp 3' },
  { id: 'external-camp-4', name: 'Camp 4' }
];

/* This ties the two camp lists together. Every camp page, dropdown, and sibling link works from this one structure, so adding a third kind of camp later only means adding an entry here. */
const campGroups = [
  { id: 'msi', label: 'MSI Camps', navKey: 'camps', camps: msiCamps },
  { id: 'external', label: 'External Camps', navKey: 'externalCamps', camps: externalCamps }
];

/* Every camp page reads these fields. A camp that does not carry its own wording yet falls back to this placeholder content, so the page layout is complete and it is obvious which text still needs writing. */
const campContentPlaceholder = {
  tagline: 'Placeholder camp summary. Replace this with one sentence describing what this camp is about.',
  ages: 'Ages 0-00',
  length: '0 day placeholder',
  location: 'Placeholder lab or classroom',
  overview: [
    'Placeholder overview paragraph. Replace this with what campers explore during the week, the kinds of materials and machines they use, and what makes this camp different from the others in its category.',
    'Placeholder second paragraph. Replace this with how the camp is paced across the days, what campers take home at the end, and anything families should know before the first morning.'
  ],
  highlights: [
    'Placeholder highlight. Replace with something campers make or do.',
    'Placeholder highlight. Replace with a skill or tool campers learn.',
    'Placeholder highlight. Replace with a challenge campers take on.',
    'Placeholder highlight. Replace with what campers take home.'
  ],
  schedule: [
    { time: 'Morning', detail: 'Placeholder schedule item. Replace with how the day opens.' },
    { time: 'Midday', detail: 'Placeholder schedule item. Replace with the main build or activity block.' },
    { time: 'Afternoon', detail: 'Placeholder schedule item. Replace with testing, iteration, or free build time.' },
    { time: 'Closing', detail: 'Placeholder schedule item. Replace with clean-up, sharing, and pick-up.' }
  ],
  gallery: [
    { image: '', caption: 'Placeholder photo of the camp space.', kind: 'Camp space' },
    { image: '', caption: 'Placeholder photo of the work tables and tools.', kind: 'Camp space' },
    { image: '', caption: 'Placeholder photo of the machines campers use.', kind: 'Camp space' },
    { image: '', caption: 'Placeholder photo of a camper project.', kind: 'Camper project' },
    { image: '', caption: 'Placeholder photo of a camper project in progress.', kind: 'Camper project' },
    { image: '', caption: 'Placeholder photo of finished projects on display.', kind: 'Camper project' }
  ]
};

/* This is the small element builder used by every function in this file. It creates a tag, optionally gives it a class, and optionally puts plain text inside it. */
function makeEl(tag, className, text) {
  /* Ask the browser for a new element of the requested tag type. */
  const node = document.createElement(tag);

  /* Attach the class name when one was provided, because CSS uses class names to style the element. */
  if (className) node.className = className;

  /* Put the text inside when one was provided. textContent is used instead of innerHTML so the value is always treated as words, never as code. */
  if (text !== undefined) node.textContent = text;

  /* Hand the finished element back to whichever function is building the page. */
  return node;
}

/* This builds the address of a camp page. Every camp shares camp.html, and the camp id in the address tells that page which camp to show. */
function campHref(campId) {
  return `camp.html?camp=${campId}`;
}

/* This looks up one camp by its id and reports which group it came from, because a camp page shows its group name and links to the other camps in the same group. It returns nothing when the id does not match any camp, so the caller can fall back to a default. */
function findCamp(campId) {
  /* Look through the MSI camps first, then the external camps. */
  for (const group of campGroups) {
    const camp = group.camps.find((entry) => entry.id === campId);
    if (camp) return { camp, group };
  }

  return null;
}

/* This builds one top-level navigation tab that is a plain link, such as Home or About. */
function createNavLink(label, href, isCurrent) {
  /* Create the link, set where it goes, and give it the shared tab styling. */
  const anchor = makeEl('a', 'navLink', label);
  anchor.href = href;

  /* Mark the tab for the page the visitor is already on, so it can be highlighted and announced correctly. */
  if (isCurrent) {
    anchor.classList.add('navCurrent');
    anchor.setAttribute('aria-current', 'page');
  }

  return anchor;
}

/* This builds one top-level navigation tab that opens a dropdown panel underneath it. The panel content is built by the caller and passed in. */
function createNavMenu(label, panel, isCurrent) {
  /* Create the wrapper that keeps the button and its panel together. */
  const wrapper = makeEl('div', 'navMenu');

  /* Create the tab button. A button is used instead of a link because it opens a menu rather than going somewhere. */
  const button = makeEl('button', 'navLink navMenuButton');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.append(document.createTextNode(label), makeEl('span', 'navCaret', 'v'));

  /* Highlight the tab when the visitor is already on one of the pages inside this menu. */
  if (isCurrent) button.classList.add('navCurrent');

  /* Clicking the tab opens this menu and closes any other menu that happens to be open. */
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !wrapper.classList.contains('open');
    closeAllNavMenus();
    wrapper.classList.toggle('open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  });

  /* Put the button and the dropdown panel into the wrapper and return the finished tab. */
  wrapper.append(button, panel);
  return wrapper;
}

/* This closes every open dropdown in the navigation bar. It runs when a new menu opens, when the visitor clicks elsewhere, and when Escape is pressed. */
function closeAllNavMenus() {
  document.querySelectorAll('.navMenu.open').forEach((menu) => {
    menu.classList.remove('open');
    const button = menu.querySelector('.navMenuButton');
    if (button) button.setAttribute('aria-expanded', 'false');
  });
}

/* This builds the dropdown panel for the "MSI Camps" tab. The panel shows one column per camp, and the whole column is the link into that camp's page. */
function createCampsPanel(currentCampId) {
  /* Create the wide panel that holds all of the camp columns. */
  const panel = makeEl('div', 'navPanel navPanelWide');

  /* Build one column for each camp, such as Mini Makers or Fab Lab. */
  msiCamps.forEach((camp) => {
    /* The whole column is a link, so there is a large easy target rather than a small line of text. */
    const column = makeEl('a', 'navColumn');
    column.href = campHref(camp.id);

    /* The column heading names the camp and the short line under it explains what that camp is. */
    column.append(makeEl('span', 'navColumnTitle', camp.name), makeEl('span', 'navColumnBlurb', camp.blurb));

    /* Highlight the camp the visitor is currently reading about. */
    if (camp.id === currentCampId) {
      column.classList.add('navCurrent');
      column.setAttribute('aria-current', 'page');
    }

    panel.appendChild(column);
  });

  return panel;
}

/* This builds the dropdown panel for the "External Camps" tab. These are partnership camps held away from the museum, listed as a simple set of links. */
function createExternalCampsPanel(currentCampId) {
  /* Create the narrow panel that holds the partnership camp links. */
  const panel = makeEl('div', 'navPanel');

  /* Turn each partnership camp into one link into camp.html. */
  externalCamps.forEach((camp) => {
    const anchor = makeEl('a', 'navPanelLink', camp.name);
    anchor.href = campHref(camp.id);

    /* Highlight the camp the visitor is currently reading about. */
    if (camp.id === currentCampId) {
      anchor.classList.add('navCurrent');
      anchor.setAttribute('aria-current', 'page');
    }

    panel.appendChild(anchor);
  });

  return panel;
}

/* This builds the whole navigation bar and places it in the <div id="siteNav"> that every page includes near the top of its body. */
function renderSiteNav() {
  /* Find the container. Pages that do not have one simply get no navigation bar. */
  const host = document.getElementById('siteNav');
  if (!host) return;

  /* Read which page this is from the data-nav attribute on <body>, so the matching tab can be highlighted. */
  let active = document.body.dataset.nav || '';

  /* Read the camp id from the address bar, which is only present on camp.html. */
  const currentCampId = new URLSearchParams(window.location.search).get('camp') || '';

  /* Camp pages all share one file, so the highlighted tab comes from which list the current camp belongs to rather than from the page itself. */
  const currentCamp = currentCampId ? findCamp(currentCampId) : null;
  if (currentCamp) active = currentCamp.group.navKey;

  /* Create the bar itself and the inner row that keeps the tabs aligned with the rest of the page content. */
  const bar = makeEl('nav', 'siteNavBar');
  bar.setAttribute('aria-label', 'Main navigation');
  const row = makeEl('div', 'siteNavRow');

  /* The site name on the left doubles as a link back to the homepage. */
  const brand = makeEl('a', 'navBrand', 'CampGrids');
  brand.href = 'index.html';

  /* Build the tabs: the four from the sketch, plus Resources for the project grid, which is the part of the site campers and staff use most. */
  const tabs = makeEl('div', 'siteNavTabs');
  tabs.append(
    createNavLink('Home', 'index.html', active === 'home'),
    createNavMenu('MSI Camps', createCampsPanel(currentCampId), active === 'camps'),
    createNavMenu('External Camps', createExternalCampsPanel(currentCampId), active === 'externalCamps'),
    createNavLink('Resources', 'campgrids.html', active === 'resources'),
    createNavLink('About', 'about.html', active === 'about')
  );

  /* Assemble the bar and put it on the page. */
  row.append(brand, tabs);
  bar.appendChild(row);
  host.appendChild(bar);

  /* Clicking anywhere outside the navigation closes any open dropdown. */
  document.addEventListener('click', closeAllNavMenus);

  /* Pressing Escape also closes any open dropdown, which keyboard users expect. */
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllNavMenus();
  });
}

/* This builds the photo gallery shown on a camp page. Each photo is a figure with a caption, and the small label above the caption says whether the photo is of the camp space or of a camper project. */
function createCampGallery(photos) {
  /* Create the grid that holds every photo tile. */
  const grid = makeEl('div', 'galleryGrid');

  /* Build one tile for each photo in the list. */
  photos.forEach((photo) => {
    const figure = makeEl('figure', 'galleryItem');

    /* Use the supplied photo when there is one, otherwise fall back to the shared placeholder image. */
    const image = makeEl('img', 'galleryImage');
    image.src = photo.image || sitePlaceholderImage;
    image.alt = photo.caption;
    image.loading = 'lazy';

    /* The caption holds the small kind label and the description of the photo. */
    const caption = makeEl('figcaption', 'galleryCaption');
    caption.append(makeEl('span', 'galleryKind', photo.kind), makeEl('span', 'galleryText', photo.caption));

    figure.append(image, caption);
    grid.appendChild(figure);
  });

  return grid;
}

/* This fills in a camp page. It reads the camp id from the address bar, finds that camp, and writes the hero, overview, highlights, schedule, and photo gallery into the containers in camp.html. */
function renderCampPage() {
  /* Find the main container. If it is missing, this is not a camp page and there is nothing to do. */
  const main = document.getElementById('campPage');
  if (!main) return;

  /* Read the requested camp id, then look it up. Unknown or missing ids fall back to the very first MSI camp so the page is never blank. */
  const requestedId = new URLSearchParams(window.location.search).get('camp');
  const match = findCamp(requestedId) || { camp: msiCamps[0], group: campGroups[0] };
  const { camp, group } = match;

  /* Each field falls back to the shared placeholder content whenever this camp has no wording of its own yet. */
  const tagline = camp.tagline || campContentPlaceholder.tagline;
  const overview = camp.overview || campContentPlaceholder.overview;
  const highlights = camp.highlights || campContentPlaceholder.highlights;
  const schedule = camp.schedule || campContentPlaceholder.schedule;
  const gallery = camp.gallery || campContentPlaceholder.gallery;

  /* Update the browser tab title so the camp name and its group are visible in history and bookmarks. */
  document.title = `${camp.name} | ${group.label} | CampGrids`;

  /* Build the page hero: the group name, the camp name, its summary line, and the short facts row. */
  const hero = makeEl('header', 'pageHero campHero');
  const heroCopy = makeEl('div', 'pageHeroCopy');
  heroCopy.append(
    makeEl('p', 'eyebrow', group.label),
    makeEl('h1', '', camp.name),
    makeEl('p', 'pageLede', tagline)
  );

  /* The facts row shows the three short details families look for first. */
  const facts = makeEl('div', 'campFacts');
  [
    ['Ages', camp.ages || campContentPlaceholder.ages],
    ['Length', camp.length || campContentPlaceholder.length],
    ['Where', camp.location || campContentPlaceholder.location]
  ].forEach(([label, value]) => {
    const fact = makeEl('div', 'campFact');
    fact.append(makeEl('span', 'campFactLabel', label), makeEl('span', 'campFactValue', value));
    facts.appendChild(fact);
  });

  heroCopy.appendChild(facts);
  hero.appendChild(heroCopy);
  main.appendChild(hero);

  /* Build the overview section, which is the plain description of the camp. */
  const about = makeEl('section', 'pageSection');
  about.append(makeEl('p', 'eyebrow', 'Overview'), makeEl('h2', '', `About ${camp.name}`));
  overview.forEach((paragraph) => about.appendChild(makeEl('p', 'sectionText', paragraph)));
  main.appendChild(about);

  /* Build the two-column band holding what campers do on the left and the daily rhythm on the right. */
  const detail = makeEl('section', 'pageSection campDetail');

  const highlightBlock = makeEl('div', 'campDetailBlock');
  highlightBlock.append(makeEl('p', 'eyebrow', 'What campers do'), makeEl('h2', '', 'In this camp'));
  const highlightList = makeEl('ul', 'campList');
  highlights.forEach((entry) => highlightList.appendChild(makeEl('li', '', entry)));
  highlightBlock.appendChild(highlightList);

  const scheduleBlock = makeEl('div', 'campDetailBlock');
  scheduleBlock.append(makeEl('p', 'eyebrow', 'A typical day'), makeEl('h2', '', 'How the day runs'));
  const scheduleList = makeEl('dl', 'campSchedule');
  schedule.forEach((slot) => {
    scheduleList.append(makeEl('dt', '', slot.time), makeEl('dd', '', slot.detail));
  });
  scheduleBlock.appendChild(scheduleList);

  detail.append(highlightBlock, scheduleBlock);
  main.appendChild(detail);

  /* Build the photo gallery of the camp space and camper projects. */
  const photos = makeEl('section', 'pageSection');
  photos.append(
    makeEl('p', 'eyebrow', 'Photo gallery'),
    makeEl('h2', '', 'Camp spaces and camper projects'),
    makeEl('p', 'sectionText', 'Photos of the room campers work in and the projects they finish. Replace these placeholder images with real camp photos.'),
    createCampGallery(gallery)
  );
  main.appendChild(photos);

  /* Build the closing band that sends visitors to the resource grid and to the other camps in this category. */
  const next = makeEl('section', 'pageSection campNext');
  next.append(makeEl('p', 'eyebrow', 'Keep exploring'), makeEl('h2', '', 'Where to go next'));

  const nextLinks = makeEl('div', 'campNextLinks');
  const gridLink = makeEl('a', 'quickLink qlBlue', 'Open CampGrids resources');
  gridLink.href = 'campgrids.html';
  nextLinks.appendChild(gridLink);

  /* Add a link to each of the other camps in the same group, so visitors can compare them quickly. */
  group.camps
    .filter((entry) => entry.id !== camp.id)
    .forEach((entry) => {
      const anchor = makeEl('a', 'quickLink qlPurple', entry.name);
      anchor.href = campHref(entry.id);
      nextLinks.appendChild(anchor);
    });

  next.appendChild(nextLinks);
  main.appendChild(next);
}

/* This fills the camp cards on the homepage, so the homepage always matches the camp menu. */
function renderCampCards() {
  /* Find the container. Pages without it simply skip this step. */
  const host = document.getElementById('campCards');
  if (!host) return;

  /* Build one card for each MSI camp. */
  msiCamps.forEach((camp) => {
    const card = makeEl('article', 'categoryCard');
    card.append(makeEl('h3', '', camp.name), makeEl('p', 'sectionText', camp.blurb));

    /* The card ends with a link into that camp's page. */
    const list = makeEl('div', 'categoryCardLinks');
    const anchor = makeEl('a', 'categoryCardLink', `Visit ${camp.name}`);
    anchor.href = campHref(camp.id);
    list.appendChild(anchor);

    card.appendChild(list);
    host.appendChild(card);
  });
}

/* These lines run on every page that loads this file. Each function checks for its own container first, so a page only gets the pieces it actually has room for. */
renderSiteNav();
renderCampPage();
renderCampCards();
