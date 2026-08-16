/* This file holds everything shared by every page: the external link list, the camp lists, the placeholder camp content, and the code that builds the top navigation bar, the homepage camp rows, the camp pages, and the photo gallery pages. Individual pages load this file first, then load any extra script they need. */

/* Shared image slot used anywhere a camp page, camp row, or gallery needs a photo that has not been supplied yet. */
const sitePlaceholderImage = 'assets/placeholder.jpg';

/* This list fills the quick link buttons on the Camp Grids page. These are outside tools rather than pages of this site, so they stay a quick link strip and are deliberately not in the navigation bar. */
const externalLinks = [
  { label: 'Belts', href: 'https://docs.google.com/spreadsheets/d/13XSBDHuYkVl0Fgng4vzA6WdHMrDKTD67eLoiP7Y3z4E/edit?usp=sharing', colorClass: 'qlPurple' },
  { label: 'TinkerCAD Portal', href: 'http://www.tinkercad.com/joinclass/HQPGBBSGD', colorClass: 'qlTeal' },
  { label: 'Scratch Usernames', href: 'https://docs.google.com/spreadsheets/d/1Xmc2GbvR3rrxGoHHxbuT-zOhzrYbOokWfGLSPpNzNk0/edit?usp=sharing', colorClass: 'qlBlue' }
];

/* Each camp is one of three kinds, and the kind decides which sections its page gets.
   themed: camps that run themed activity weeks, so the page shows the themed week cards.
   grid:   camps that work through the Camp Grids curriculum, so the page shows the Camp Grids section.
   info:   camps that do neither yet, so the page stays a plain description with photos. */
const msiCamps = [
  {
    id: 'tinker-tots',
    name: 'Tinker Tots',
    grades: 'Grades 0-0',
    location: 'Tinker Studio',
    kind: 'themed'
  },
  {
    id: 'mini-makers',
    name: 'Mini Makers',
    grades: 'Grades 0-0',
    location: 'Crime Lab',
    kind: 'themed'
  },
  {
    id: 'young-adventurers',
    name: 'Young Adventurers',
    grades: 'Grades 0-0',
    location: 'The Grid Zone',
    kind: 'themed'
  },
  {
    id: 'young-makers',
    name: 'Young Makers',
    grades: 'Grades 0-0',
    location: 'Balcony: Studio A & B',
    kind: 'grid',
    blurb: 'Learn various crafting methods, gain the opportunity to use digital fabrication machines, and compete to earn the most belts in our Camp Grid curriculum.',
    overview: [
      'Campers utilize the Camp Grid curriculum to explore crafting methods and digital fabrication machines. The projects range from paper crafts, to science experiments, to fiber arts, to laser cutting, and more.',
      'Placeholder for more.'
    ]
  },
  {
    id: 'explorers',
    name: 'Explorers',
    grades: 'Grades 0-0',
    location: 'The Grid Zone',
    kind: 'themed'
  },
  {
    id: 'fab-lab-makers',
    name: 'Fab Lab Makers',
    grades: 'Grades 0-0',
    location: 'Balcony: Studio C',
    kind: 'grid'
  },
  {
    id: 'fab-lab-apprentices',
    name: 'Fab Lab Apprentices',
    grades: 'Grades 0-0',
    location: 'Fab Lab Studio',
    kind: 'grid'
  }
];

/* This is the camp list behind the "External Camps" tab. These are the partnership camps that run away from museum premises. The names are placeholders until the real partnership camps are known. */
const externalCamps = [
  { id: 'external-camp-1', name: 'Camp 1', kind: 'info' },
  { id: 'external-camp-2', name: 'Camp 2', kind: 'info' },
  { id: 'external-camp-3', name: 'Camp 3', kind: 'info' },
  { id: 'external-camp-4', name: 'Camp 4', kind: 'info' }
];

/* This ties the two camp lists together. Every camp page, dropdown, and sibling link works from this one structure, so adding a third kind of camp later only means adding an entry here. */
const campGroups = [
  { id: 'msi', label: 'MSI Camps', navKey: 'camps', camps: msiCamps },
  { id: 'external', label: 'External Camps', navKey: 'externalCamps', camps: externalCamps }
];

/* Every camp page reads these fields. A camp that does not carry its own wording yet falls back to this placeholder content, so the page layout is complete and it is obvious which text still needs writing. */
const campContentPlaceholder = {
  grades: 'Grades 0-0',
  location: 'Placeholder room',
  blurb: 'Placeholder camp summary. Replace this with one sentence describing what this camp is about.',
  overview: [
    'Placeholder overview paragraph. Replace this with what campers explore during the week, the kinds of materials and machines they use, and what makes this camp different from the others.',
    'Placeholder second paragraph. Replace this with how the camp is paced across the days, what campers take home at the end, and anything families should know before the first morning.'
  ],
  schedule: [
    { time: 'Morning', detail: 'Placeholder schedule item. Replace with how the day opens.' },
    { time: 'Midday', detail: 'Placeholder schedule item. Replace with the main build or activity block.' },
    { time: 'Afternoon', detail: 'Placeholder schedule item. Replace with testing, iteration, or free build time.' },
    { time: 'Closing', detail: 'Placeholder schedule item. Replace with clean-up, sharing, and pick-up.' }
  ],
  /* These four themed weeks come from the MSI website and act as the shared starting point for every themed camp. Give a camp its own themedWeeks list to replace them. */
  themedWeeks: [
    {
      id: 'eco-engineers',
      name: 'Eco Engineers',
      detail: 'Put your design and innovation skills to the test as you explore how design tech can create new possibilities for how we interact with the natural world!'
    },
    {
      id: 'circuit-benders',
      name: 'Circuit Benders',
      detail: 'Learn how circuit systems harness electricity to power the world around us. Bend and squish circuits to build energizing objects and create solutions. With these skills at your fingertips, the power is yours!'
    },
    {
      id: 'super-powered-science',
      name: 'Super Powered Science',
      detail: 'Whether flying through the city or writing code to change the world, being a superhero takes a lot of science. Learn how to build your own superhero tech with our vast array of fabrication tools. Unlock your inner superhero and discover how you can change the world!'
    },
    {
      id: 'fiber-artists',
      name: 'Fiber Artists',
      detail: 'Learn about a variety of crafting techniques and leave with a custom design made by one of the greatest artists in the world... YOU! Plus, learn the tools and techniques to create your own interactive art piece.'
    }
  ],
  /* These bullet points sit under the Camp Grids heading on camps that use the curriculum. */
  gridPoints: [
    'Placeholder highlight. Replace with something campers make or do.',
    'Placeholder highlight. Replace with a skill or tool campers learn.',
    'Placeholder highlight. Replace with a challenge campers take on.',
    'Placeholder highlight. Replace with what campers take home.'
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

/* This builds the address of a photo gallery page. A themed week id can be added so the gallery shows the photos for that week rather than the whole camp. */
function galleryHref(campId, weekId) {
  return weekId ? `gallery.html?camp=${campId}&week=${weekId}` : `gallery.html?camp=${campId}`;
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

/* This reads one field off a camp, falling back to the shared placeholder whenever that camp has no wording of its own yet. */
function campField(camp, field) {
  return camp[field] || campContentPlaceholder[field];
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

/* This builds a dropdown panel listing one camp per row. Both camp menus use it, so the MSI Camps menu and the External Camps menu look and behave the same. Descriptions are deliberately left out because they are already on the homepage. */
function createCampMenuPanel(camps, currentCampId) {
  /* Create the narrow panel that holds the camp links. */
  const panel = makeEl('div', 'navPanel');

  /* Turn each camp into one row inside the panel. */
  camps.forEach((camp) => {
    const anchor = makeEl('a', 'navPanelLink');
    anchor.href = campHref(camp.id);

    /* The row shows the camp name, then its grade levels in smaller text beside it. */
    anchor.append(makeEl('span', 'navPanelName', camp.name), makeEl('span', 'navPanelGrades', campField(camp, 'grades')));

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

  /* Read the camp id from the address bar, which is present on camp.html and gallery.html. */
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

  /* Build the four tabs from the sketch: Home, the MSI Camps menu, the External Camps menu, and About. */
  const tabs = makeEl('div', 'siteNavTabs');
  tabs.append(
    createNavLink('Home', 'index.html', active === 'home'),
    createNavMenu('MSI Camps', createCampMenuPanel(msiCamps, currentCampId), active === 'camps'),
    createNavMenu('External Camps', createCampMenuPanel(externalCamps, currentCampId), active === 'externalCamps'),
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

/* This builds a grid of photos. Each photo is a figure with a caption, and the small label above the caption says whether the photo is of the camp space or of a camper project. */
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

/* This builds the wide photo strip that sits at the very top of a camp page, under the navigation bar. */
function createCampHeroImage(camp) {
  const wrap = makeEl('div', 'campHeroImage');
  const image = makeEl('img', 'campHeroPhoto');
  image.src = camp.image || sitePlaceholderImage;
  image.alt = `${camp.name} camp photo`;
  wrap.appendChild(image);
  return wrap;
}

/* This builds the "Themed Activity Weeks" cards shown on camps that run themed weeks. Each card ends with a button that opens the photo gallery for that week. */
function createThemedWeeks(camp) {
  /* Create the section and its headings. */
  const section = makeEl('section', 'pageSection');
  section.append(makeEl('p', 'eyebrow', 'What campers do'), makeEl('h2', '', 'Themed Activity Weeks'));

  /* Create the grid of week cards. */
  const grid = makeEl('div', 'themedWeeks');

  campField(camp, 'themedWeeks').forEach((week) => {
    const card = makeEl('article', 'themedWeek');
    card.append(makeEl('h3', '', week.name), makeEl('p', 'sectionText', week.detail));

    /* The button opens the photo gallery filtered to this themed week. */
    const button = makeEl('a', 'quickLink themedWeekButton', 'Gallery');
    button.href = galleryHref(camp.id, week.id);
    card.appendChild(button);

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

/* This builds the "What campers use / The Camp Grids" section shown on camps that work through the Camp Grids curriculum. */
function createGridSection(camp) {
  /* Create the section and its headings. */
  const section = makeEl('section', 'pageSection');
  section.append(makeEl('p', 'eyebrow', 'What campers use'), makeEl('h2', '', 'The Camp Grids'));

  /* List what campers do with the curriculum. */
  const list = makeEl('ul', 'campList');
  campField(camp, 'gridPoints').forEach((entry) => list.appendChild(makeEl('li', '', entry)));
  section.appendChild(list);

  /* Both buttons sit under the list: one opens the curriculum itself, the other opens this camp's photos. */
  const buttons = makeEl('div', 'campNextLinks');

  const gridLink = makeEl('a', 'quickLink qlBlue', 'Open CampGrids activities');
  gridLink.href = 'campgrids.html';

  const galleryLink = makeEl('a', 'quickLink', 'Gallery');
  galleryLink.href = galleryHref(camp.id);

  buttons.append(gridLink, galleryLink);
  section.appendChild(buttons);

  return section;
}

/* This fills in a camp page. It reads the camp id from the address bar, finds that camp, and writes the hero, typical day, camp-kind section, photos, and closing links into the container in camp.html. */
function renderCampPage() {
  /* Find the main container. If it is missing, this is not a camp page and there is nothing to do. */
  const main = document.getElementById('campPage');
  if (!main) return;

  /* Read the requested camp id, then look it up. Unknown or missing ids fall back to the very first MSI camp so the page is never blank. */
  const requestedId = new URLSearchParams(window.location.search).get('camp');
  const match = findCamp(requestedId) || { camp: msiCamps[0], group: campGroups[0] };
  const { camp, group } = match;

  /* Update the browser tab title so the camp name and its group are visible in history and bookmarks. */
  document.title = `${camp.name} | ${group.label} | CampGrids`;

  /* Start with the wide camp photo across the top of the page. */
  main.appendChild(createCampHeroImage(camp));

  /* Build the page hero: the group name, the camp name, the overview paragraphs, and the short facts row. */
  const hero = makeEl('header', 'pageHero campHero');
  const heroCopy = makeEl('div', 'pageHeroCopy');
  heroCopy.append(makeEl('p', 'eyebrow', group.label), makeEl('h1', '', camp.name));

  /* The overview sits directly under the title, because the one-line summary is already on the homepage. */
  campField(camp, 'overview').forEach((paragraph) => heroCopy.appendChild(makeEl('p', 'pageLede', paragraph)));

  /* The facts row shows the two short details families look for: who the camp is for, and which room it runs in. */
  const facts = makeEl('div', 'campFacts');
  [
    ['Grade levels', campField(camp, 'grades')],
    ['Where', campField(camp, 'location')]
  ].forEach(([label, value]) => {
    const fact = makeEl('div', 'campFact');
    fact.append(makeEl('span', 'campFactLabel', label), makeEl('span', 'campFactValue', value));
    facts.appendChild(fact);
  });

  heroCopy.appendChild(facts);
  hero.appendChild(heroCopy);
  main.appendChild(hero);

  /* Build the daily rhythm section. */
  const schedule = makeEl('section', 'pageSection');
  schedule.append(makeEl('p', 'eyebrow', 'A typical day'), makeEl('h2', '', 'How the day runs'));
  const scheduleList = makeEl('dl', 'campSchedule');
  campField(camp, 'schedule').forEach((slot) => {
    scheduleList.append(makeEl('dt', '', slot.time), makeEl('dd', '', slot.detail));
  });
  schedule.appendChild(scheduleList);
  main.appendChild(schedule);

  /* Themed camps get the themed week cards. Camps that use the curriculum get the Camp Grids section instead. */
  if (camp.kind === 'themed') main.appendChild(createThemedWeeks(camp));
  if (camp.kind === 'grid') main.appendChild(createGridSection(camp));

  /* Themed camps reach their photos through the week cards, so they do not repeat a gallery here. Every other camp shows its photos on the page. */
  if (camp.kind !== 'themed') {
    const photos = makeEl('section', 'pageSection');
    photos.append(
      makeEl('p', 'eyebrow', 'Photo gallery'),
      makeEl('h2', '', 'Camp spaces and camper projects'),
      makeEl('p', 'sectionText', 'Photos of the room campers work in and the projects they finish. Replace these placeholder images with real camp photos.'),
      createCampGallery(campField(camp, 'gallery'))
    );
    main.appendChild(photos);
  }

  /* Build the closing band that sends visitors to the Camp Grids page and to the other camps in this group. */
  const next = makeEl('section', 'pageSection campNext');
  next.append(makeEl('p', 'eyebrow', 'Keep exploring'), makeEl('h2', '', 'Where to go next'));

  const nextLinks = makeEl('div', 'campNextLinks');
  const gridLink = makeEl('a', 'quickLink qlBlue', 'Open CampGrids activities');
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

/* This fills in a photo gallery page. The camp id in the address says whose photos to show, and an optional themed week id narrows it to one week. */
function renderGalleryPage() {
  /* Find the main container. If it is missing, this is not a gallery page and there is nothing to do. */
  const main = document.getElementById('galleryPage');
  if (!main) return;

  /* Read the camp and week from the address, then look the camp up. */
  const params = new URLSearchParams(window.location.search);
  const match = findCamp(params.get('camp')) || { camp: msiCamps[0], group: campGroups[0] };
  const { camp, group } = match;

  /* Find the themed week when one was asked for, so the page can be titled after it. */
  const weekId = params.get('week');
  const week = weekId ? campField(camp, 'themedWeeks').find((entry) => entry.id === weekId) : null;

  /* The page is named after the week when there is one, and after the camp otherwise. */
  const title = week ? `${camp.name}: ${week.name}` : camp.name;
  document.title = `${title} photos | CampGrids`;

  /* Build the page hero. */
  const hero = makeEl('header', 'pageHero');
  const heroCopy = makeEl('div', 'pageHeroCopy');
  heroCopy.append(makeEl('p', 'eyebrow', `${group.label} photo gallery`), makeEl('h1', '', title));
  heroCopy.appendChild(makeEl('p', 'pageLede', week
    ? week.detail
    : 'Photos of the room campers work in and the projects they finish. Replace these placeholder images with real camp photos.'));
  hero.appendChild(heroCopy);
  main.appendChild(hero);

  /* Build the photo grid itself. */
  const photos = makeEl('section', 'pageSection');
  photos.appendChild(createCampGallery(campField(camp, 'gallery')));
  main.appendChild(photos);

  /* Close with a way back to the camp page. */
  const next = makeEl('section', 'pageSection');
  next.append(makeEl('p', 'eyebrow', 'Keep exploring'), makeEl('h2', '', 'Where to go next'));
  const nextLinks = makeEl('div', 'campNextLinks');
  const back = makeEl('a', 'quickLink qlBlue', `Back to ${camp.name}`);
  back.href = campHref(camp.id);
  nextLinks.appendChild(back);
  next.appendChild(nextLinks);
  main.appendChild(next);
}

/* This fills the camp rows on the homepage, so the homepage always matches the camp menu. Each row is a photo beside the camp name, its grade levels, a short description, and a button. */
function renderCampCards() {
  /* Find the container. Pages without it simply skip this step. */
  const host = document.getElementById('campCards');
  if (!host) return;

  /* Build one row for each MSI camp. The alternating background colors come from CSS using the row position. */
  msiCamps.forEach((camp) => {
    const row = makeEl('article', 'campRow');

    /* The photo sits on the left of the row. */
    const figure = makeEl('div', 'campRowImage');
    const image = makeEl('img', 'campRowPhoto');
    image.src = camp.image || sitePlaceholderImage;
    image.alt = `${camp.name} camp photo`;
    image.loading = 'lazy';
    figure.appendChild(image);

    /* The text panel sits on the right and holds the name, grade levels, description, and button. */
    const copy = makeEl('div', 'campRowCopy');
    const heading = makeEl('h3', 'campRowTitle');
    heading.append(makeEl('span', '', camp.name), makeEl('span', 'campRowGrades', campField(camp, 'grades')));
    copy.append(heading, makeEl('p', 'sectionText', campField(camp, 'blurb')));

    const anchor = makeEl('a', 'quickLink campRowButton', `Visit ${camp.name}`);
    anchor.href = campHref(camp.id);
    copy.appendChild(anchor);

    row.append(figure, copy);
    host.appendChild(row);
  });
}

/* These lines run on every page that loads this file. Each function checks for its own container first, so a page only gets the pieces it actually has room for. */
renderSiteNav();
renderCampPage();
renderGalleryPage();
renderCampCards();
