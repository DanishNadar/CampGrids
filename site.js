/* This file holds everything shared by every page: the external link list, the camp menu structure, the placeholder camp content, and the code that builds the top navigation bar. Individual pages load this file first, then load any extra script they need. */

/* Shared image slot used anywhere a camp page or gallery needs a photo that has not been supplied yet. */
const sitePlaceholderImage = 'assets/placeholder.jpg';

/* This list fills the "External Links" menu in the navigation bar, and it also fills the quick link buttons on the CampGrids page. Editing a link here changes it everywhere on the site. */
const externalLinks = [
  { label: 'Belts', href: 'https://docs.google.com/spreadsheets/d/13XSBDHuYkVl0Fgng4vzA6WdHMrDKTD67eLoiP7Y3z4E/edit?usp=sharing', colorClass: 'qlPurple' },
  { label: 'TinkerCAD Portal', href: 'http://www.tinkercad.com/joinclass/HQPGBBSGD', colorClass: 'qlTeal' },
  { label: 'Scratch Usernames', href: 'https://docs.google.com/spreadsheets/d/1Xmc2GbvR3rrxGoHHxbuT-zOhzrYbOokWfGLSPpNzNk0/edit?usp=sharing', colorClass: 'qlBlue' }
];

/* This is the camp menu structure behind the "MSI Camps" tab. Each entry is one camp category, and each camp inside it becomes one page rendered by camp.html. Add a camp by adding an object to a camps list; the navigation and the camp pages both follow this data. */
const campCategories = [
  {
    id: 'mini-makers',
    name: 'Mini Makers',
    blurb: 'Short, playful sessions for the youngest campers, built around hands-on making.',
    camps: [
      { id: 'mini-makers-1', name: 'Camp 1' },
      { id: 'mini-makers-2', name: 'Camp 2' },
      { id: 'mini-makers-3', name: 'Camp 3' },
      { id: 'mini-makers-4', name: 'Camp 4' }
    ]
  },
  {
    id: 'young-makers',
    name: 'Young Makers',
    blurb: 'Longer projects where campers plan, build, test, and improve their own work.',
    camps: [
      { id: 'young-makers-1', name: 'Camp 1' },
      { id: 'young-makers-2', name: 'Camp 2' },
      { id: 'young-makers-3', name: 'Camp 3' },
      { id: 'young-makers-4', name: 'Camp 4' }
    ]
  },
  {
    id: 'fab-lab',
    name: 'Fab Lab',
    blurb: 'Digital fabrication camps using the lab machines, from laser cutting to 3D printing.',
    camps: [
      { id: 'fab-lab-1', name: 'Camp 1' },
      { id: 'fab-lab-2', name: 'Camp 2' },
      { id: 'fab-lab-3', name: 'Camp 3' },
      { id: 'fab-lab-4', name: 'Camp 4' }
    ]
  }
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

/* This makes a link open safely in a new browser tab. It is used for links that leave this site. */
function openInNewTab(anchor) {
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
}

/* This builds the address of a camp page. Every camp shares camp.html, and the camp id in the address tells that page which camp to show. */
function campHref(campId) {
  return `camp.html?camp=${campId}`;
}

/* This searches the camp menu for one camp id and returns both the camp and the category it belongs to, because camp pages show the category name as well. */
function findCamp(campId) {
  /* Look through every category, then every camp inside that category. */
  for (const category of campCategories) {
    const camp = category.camps.find((entry) => entry.id === campId);
    /* Return as soon as the matching camp is found, along with its parent category. */
    if (camp) return { camp, category };
  }

  /* Return nothing when the id does not match any camp, so the caller can fall back to a default. */
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

/* This builds the dropdown panel for the "MSI Camps" tab. The panel shows one column per camp category, and each column lists the camps inside that category. */
function createCampsPanel(currentCampId) {
  /* Create the wide panel that holds all of the category columns. */
  const panel = makeEl('div', 'navPanel navPanelWide');

  /* Build one column for each camp category, such as Mini Makers or Fab Lab. */
  campCategories.forEach((category) => {
    const column = makeEl('div', 'navColumn');

    /* The column heading names the camp category and the short line under it explains what that category is. */
    column.append(makeEl('span', 'navColumnTitle', category.name), makeEl('span', 'navColumnBlurb', category.blurb));

    /* List every camp in this category as its own link into camp.html. */
    category.camps.forEach((camp) => {
      const anchor = makeEl('a', 'navPanelLink', camp.name);
      anchor.href = campHref(camp.id);

      /* Highlight the camp the visitor is currently reading about. */
      if (camp.id === currentCampId) {
        anchor.classList.add('navCurrent');
        anchor.setAttribute('aria-current', 'page');
      }

      column.appendChild(anchor);
    });

    panel.appendChild(column);
  });

  return panel;
}

/* This builds the dropdown panel for the "External Links" tab. Every link here leaves the site, so each one opens in a new tab. */
function createExternalPanel() {
  /* Create the narrow panel that holds the outside links. */
  const panel = makeEl('div', 'navPanel');

  /* Turn each entry in the shared externalLinks list into one link inside the panel. */
  externalLinks.forEach((link) => {
    const anchor = makeEl('a', 'navPanelLink', link.label);
    anchor.href = link.href;
    openInNewTab(anchor);
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
  const active = document.body.dataset.nav || '';

  /* Read the camp id from the address bar, which is only present on camp.html. */
  const currentCampId = new URLSearchParams(window.location.search).get('camp') || '';

  /* Create the bar itself and the inner row that keeps the tabs aligned with the rest of the page content. */
  const bar = makeEl('nav', 'siteNavBar');
  bar.setAttribute('aria-label', 'Main navigation');
  const row = makeEl('div', 'siteNavRow');

  /* The site name on the left doubles as a link back to the homepage. */
  const brand = makeEl('a', 'navBrand', 'CampGrids');
  brand.href = 'index.html';

  /* Build the four tabs from the sketch: Home, the MSI Camps menu, the External Links menu, and About. */
  const tabs = makeEl('div', 'siteNavTabs');
  tabs.append(
    createNavLink('Home', 'index.html', active === 'home'),
    createNavMenu('MSI Camps', createCampsPanel(currentCampId), active === 'camps'),
    createNavMenu('External Links', createExternalPanel(), false),
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

  /* Read the requested camp id, then look it up. Unknown or missing ids fall back to the very first camp so the page is never blank. */
  const requestedId = new URLSearchParams(window.location.search).get('camp');
  const match = findCamp(requestedId) || { camp: campCategories[0].camps[0], category: campCategories[0] };
  const { camp, category } = match;

  /* Each field falls back to the shared placeholder content whenever this camp has no wording of its own yet. */
  const tagline = camp.tagline || campContentPlaceholder.tagline;
  const overview = camp.overview || campContentPlaceholder.overview;
  const highlights = camp.highlights || campContentPlaceholder.highlights;
  const schedule = camp.schedule || campContentPlaceholder.schedule;
  const gallery = camp.gallery || campContentPlaceholder.gallery;

  /* Update the browser tab title so the camp name is visible in history and bookmarks. */
  document.title = `${camp.name} | ${category.name} | CampGrids`;

  /* Build the page hero: the category name, the camp name, its summary line, and the short facts row. */
  const hero = makeEl('header', 'pageHero campHero');
  const heroCopy = makeEl('div', 'pageHeroCopy');
  heroCopy.append(
    makeEl('p', 'eyebrow', category.name),
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

  /* Add a link to each of the other camps in the same category, so visitors can compare them quickly. */
  category.camps
    .filter((entry) => entry.id !== camp.id)
    .forEach((entry) => {
      const anchor = makeEl('a', 'quickLink qlPurple', `${category.name}: ${entry.name}`);
      anchor.href = campHref(entry.id);
      nextLinks.appendChild(anchor);
    });

  next.appendChild(nextLinks);
  main.appendChild(next);
}

/* This fills the camp category cards on the homepage, so the homepage always matches the camp menu. */
function renderCampCategoryCards() {
  /* Find the container. Pages without it simply skip this step. */
  const host = document.getElementById('campCategoryCards');
  if (!host) return;

  /* Build one card for each camp category, listing the camps it contains. */
  campCategories.forEach((category) => {
    const card = makeEl('article', 'categoryCard');
    card.append(makeEl('h3', '', category.name), makeEl('p', 'sectionText', category.blurb));

    /* List the camps in this category as links straight into their pages. */
    const list = makeEl('div', 'categoryCardLinks');
    category.camps.forEach((camp) => {
      const anchor = makeEl('a', 'categoryCardLink', camp.name);
      anchor.href = campHref(camp.id);
      list.appendChild(anchor);
    });

    card.appendChild(list);
    host.appendChild(card);
  });
}

/* These lines run on every page that loads this file. Each function checks for its own container first, so a page only gets the pieces it actually has room for. */
renderSiteNav();
renderCampPage();
renderCampCategoryCards();
