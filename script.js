/* This JS file manages the project data and builds the quick links, category cards, belt sections, and project rows. */

/* Shared image slot used anywhere a card, quick link, or project row needs a visual. */
const placeholderSrc = 'assets/placeholder.jpg';

/* This list controls the shortcut buttons at the top of the page. Each item has a label: the words shown on the button, href: the page or document the button opens, color: the CSS color class used for the button */
const quickLinks = [
  { label: 'Camp Portal', href: 'https://sites.google.com/view/fablabcamps/home', colorClass: 'qlBlue' },
  { label: 'Camp Grid Sheet', href: 'https://docs.google.com/spreadsheets/d/13XSBDHuYkVl0Fgng4vzA6WdHMrDKTD67eLoiP7Y3z4E/edit?usp=sharing', colorClass: 'qlPurple' },
  { label: 'TinkerCAD Portal', href: 'http://www.tinkercad.com/joinclass/HQPGBBSGD', colorClass: 'qlTeal' },
  { label: 'Scratch Usernames', href: 'https://docs.google.com/spreadsheets/d/1Xmc2GbvR3rrxGoHHxbuT-zOhzrYbOokWfGLSPpNzNk0/edit?usp=sharing', colorClass: 'qlBlue' }
];

/* Curriculum data: each category has a name, color, description, belt sections, project titles, links, and resource types. Add new projects in the workbook, then run updateInterface.bat to rebuild this block. */
const campData = [
  {
    "id": "notebooking",
    "name": "Notebooking",
    "description": "Sketch, record, reflect, and document maker work.",
    "color": "#2596be",
    "image": "assets/Notebooking_Cover.png",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-notebook",
            "title": "Notebook",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Notebook",
                "href": "https://docs.google.com/document/d/1pR6EuSTzPdrjEb9VxxsBYX7IazxlkjfPehHYuQlSgCM/edit?usp=sharing",
                "type": "resource",
                "image": "assets/Notebooking_WT.png"
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-written-notes",
            "title": "Written Notes",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Written Notes",
                "href": "https://drive.google.com/open?id=11-4Olb4yIMDuacq34q_M2-NCTFGE8F2BTXxTuiKSPAc",
                "type": "resource",
                "image": "assets/Notebooking_YW.png"
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-simple-sketching",
            "title": "Simple Sketching",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Simple Sketching",
                "href": "https://docs.google.com/document/d/1MhpQloHlCB4Wn8asrfQImHiphBb5rfIrVwWenKiMX24/edit?usp=sharing",
                "type": "resource",
                "image": "assets/Notebooking_OR.png"
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-the-innovation-process",
            "title": "The Innovation Process",
            "items": [
              // Project rows listed under this section.
              {
                "title": "The Innovation Process",
                "href": "https://docs.google.com/presentation/d/16xBTtXYuueqzE3l3q3A3edR0jkKQmpY2hgTx67OmQ8w/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-notebook-rough-sketch",
            "title": "Notebook Rough Sketch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Notebook Rough Sketch",
                "href": "https://drive.google.com/open?id=1aRGnYDaspwjgyWHhU1GOp7IMsLQZeWaBvKbXfdslLOg",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-notebook-detail-sketch",
            "title": "Notebook Detail Sketch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Notebook Detail Sketch",
                "href": "https://drive.google.com/open?id=15KiIzkpOb8_odfrRTeadHHxGLxmw2ugRQerdM7kJc5s",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-sketch-model",
            "title": "Sketch Model",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Sketch Model",
                "href": "https://drive.google.com/open?id=15NXBMsNSQi01KFgzgrY-GwT2-yyIsa7U1DzxTN6ImAs",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-recording-data",
            "title": "Recording Data",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Recording Data",
                "href": "https://docs.google.com/document/d/1bKx6wJshooVdf_zz6WHUsWKLmMczZWH88G_hvAS-apI",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 8
    // Total project rows in this category.
  },
  {
    "id": "origami-figure",
    "name": "Origami (Figure)",
    "description": "Fold animals, figures, and paper characters.",
    "color": "#2596be",
    "image": "assets/OrigamiFigure_Cover.png",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. Make a Square Sheet of Paper: Instructions",
                "href": "https://docs.google.com/document/d/1CTuENjsKcSaLcZ0kOcMBGBpEvwTz58j0/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "1. Make a Square Sheet of Paper: Video",
                "href": "https://www.youtube.com/watch?v=_5pWN0O2i2I",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2. Make a Whale: Instructions",
                "href": "https://origami.me/whale/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "2. Make a Whale :Videos",
                "href": "https://www.youtube.com/watch?v=8dLe5dS4b60",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-angel-fish",
            "title": "Angel Fish",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Angel Fish: Instructions",
                "href": "http://origami.me/angelfish/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Angel Fish: Video",
                "href": "https://www.youtube.com/watch?v=NxUV-Rao4TM",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-cat-face",
            "title": "Cat Face",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cat Face: Instructions",
                "href": "http://origami.me/cat-face/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Cat Face: Video",
                "href": "https://www.youtube.com/watch?v=lLmtLKVMoAs",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-simple-frog",
            "title": "Simple Frog",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Simple Frog: Instructions",
                "href": "https://www.origamiway.com/easy-origami-frog.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Simple Frog: Video",
                "href": "https://www.youtube.com/watch?v=1kZjq8f8Mpo",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-cicada",
            "title": "Cicada",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cicada: Instructions",
                "href": "http://origami.me/cicada/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Cicada: Video",
                "href": "https://www.youtube.com/watch?v=HkHX18n4tak",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-fox",
            "title": "Fox",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fox: Instructions",
                "href": "http://origami.me/fox/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-fox",
            "title": "Fox",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fox: Video",
                "href": "https://www.youtube.com/watch?v=DJ23zgGAg6c",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-jumping-frog",
            "title": "Jumping Frog",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Jumping Frog: Instructions",
                "href": "https://www.origamiway.com/origami-jumping-frog.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Jumping Frog: Video",
                "href": "https://www.youtube.com/watch?v=1kZjq8f8Mpo",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-beetle",
            "title": "Beetle",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Beetle: Instructions",
                "href": "http://origami.me/beetle/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Beetle: Video",
                "href": "https://www.youtube.com/watch?v=Hdj_Vr7dOok",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-flapping-bird",
            "title": "Flapping Bird",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Flapping Bird: Instructions",
                "href": "https://www.origamiway.com/origami-flapping-bird.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Flapping Bird: Video",
                "href": "https://www.youtube.com/watch?v=DD1M3VrNSt4",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-traditional-crane",
            "title": "Traditional Crane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Traditional Crane: Instructions",
                "href": "https://www.origamiway.com/origami-crane.shtml",
                "type": "resource",
                "image": "assets/OrigamiFigure_BU_TraditionalCrane.png"
              },
              {
                "title": "Traditional Crane: Video",
                "href": "https://www.youtube.com/watch?v=KfnyopxdJXQ",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-iris",
            "title": "Iris",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Iris: Instructions",
                "href": "http://origami.me/iris/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Iris: Video",
                "href": "https://www.youtube.com/watch?v=QY9LE0bDFxY",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-lion",
            "title": "Lion",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Lion: Instructions",
                "href": "http://origami.me/lion/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Lion: Video",
                "href": "https://www.youtube.com/watch?v=XSM0DTx7nZE",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-seal",
            "title": "Seal",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Seal: Instructions",
                "href": "http://origami.me/seal/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Seal: Video",
                "href": "https://www.youtube.com/watch?v=U3SH59mHURA",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-rabbit",
            "title": "Rabbit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Rabbit: Instructions",
                "href": "http://origami.me/rabbit/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Rabbit: Video",
                "href": "https://www.youtube.com/watch?v=6QqBvy_yO_M",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-parrot",
            "title": "Parrot",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Parrot: Instructions",
                "href": "http://origami.me/parrot/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-parrot-video",
            "title": "Parrot: Video*",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Parrot: Video*",
                "href": "https://www.youtube.com/watch?v=lchxv2BOg6M",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-advanced-frog",
            "title": "Advanced Frog",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Advanced Frog: Instructions",
                "href": "http://origami.me/traditional-frog/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 33
    // Total project rows in this category.
  },
  {
    "id": "origami-modular",
    "name": "Origami (Modular)",
    "description": "Build geometric forms from repeated paper units.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. Make a Square Sheet of Paper: Instructions",
                "href": "https://docs.google.com/document/d/1CTuENjsKcSaLcZ0kOcMBGBpEvwTz58j0/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "1. Make a Square Sheet of Paper: Videos",
                "href": "https://www.youtube.com/watch?v=_5pWN0O2i2I",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-water-bomb-base",
            "title": "Water Bomb Base",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Water Bomb Base: Instructions",
                "href": "https://docs.google.com/document/d/1S-UltC3lh4c3PVYMkcn3Qb50i0pxZzjc/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Water Bomb Base: Video",
                "href": "https://www.youtube.com/watch?v=yl1rjHml2Gc",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-sunken-octahedron",
            "title": "Sunken Octahedron",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Sunken Octahedron: Instructions",
                "href": "https://docs.google.com/document/d/1vToFCTdHDbcYkI2YD79fDYa8ZD2H_EOt/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Sunken Octahedron: Video",
                "href": "https://www.youtube.com/watch?v=qWk8WVvWrM8",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-cris-cros-cube",
            "title": "Cris-Cros Cube",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cris-Cros Cube: Instructions",
                "href": "https://docs.google.com/document/d/1BbSvuZO7bEbNm6923o-tipX7Dhoq7-7u/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-cris-cros-cube-videos",
            "title": "Cris-Cros Cube: Videos *",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cris-Cros Cube: Videos *",
                "href": "https://www.youtube.com/watch?v=HQhBOLABSkg",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-twelve-pointed-star",
            "title": "Twelve Pointed Star",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Twelve Pointed Star: Instructions",
                "href": "https://docs.google.com/document/d/1Sa6N65Hoc1WIvCtPzR795ZfquvDLlkfF/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Twelve Pointed Star: Video",
                "href": "https://youtu.be/HQhBOLABSkg?t=9m23s",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-fold-a-sonobe-module",
            "title": "Fold a Sonobe Module",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fold a Sonobe Module: Instructions",
                "href": "https://docs.google.com/document/d/1dgxhr5qlsitkkgiaY6wlGuSyngiL0EHh/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Fold a Sonobe Module: Video",
                "href": "https://www.youtube.com/watch?v=TKGW2W168H0",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-transforming-ninja-star",
            "title": "Transforming Ninja Star",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Transforming Ninja Star: Instructions",
                "href": "https://www.origamiway.com/origami-transforming-ninja-star.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Transforming Ninja Star: Video",
                "href": "https://www.youtube.com/watch?v=n01fsCDWAUc",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-assemble-simple-sonobe-models",
            "title": "Assemble Simple Sonobe Models",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Assemble Simple Sonobe Models: Instructions",
                "href": "https://docs.google.com/document/d/1XRv37KP5nvnkTTfHkhthh6XgjaloLgzj/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Assemble Simple Sonobe Models: Videos",
                "href": "https://www.youtube.com/watch?v=WasvUFXmACk",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-assemble-a-complex-sonobe-model",
            "title": "Assemble a Complex Sonobe Model",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Assemble a Complex Sonobe Model: Instructions",
                "href": "https://docs.google.com/document/d/1QRrfGQSA7azPW3cT8g7CkTuAKP8LWXd0/edit",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Assemble a Complex Sonobe Model: Video",
                "href": "https://www.youtube.com/watch?v=rWWyDVBV-qc",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "paper-craft",
    "name": "Paper Craft",
    "description": "Make playful paper models and moving paper projects.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-simple-stand-up-cat",
            "title": "Simple Stand-Up Cat",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Simple Stand-Up Cat: Instructions",
                "href": "https://drive.google.com/file/d/1FIz1vNG9k89cLokLkq1VQYo6z3GPGxTD/view",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Simple Stand-Up Cat: Video",
                "href": "https://youtu.be/6L_gQ1-Tno8?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-jumping-frog",
            "title": "Jumping Frog",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Jumping Frog: Instructions",
                "href": "https://www.origamiway.com/easy-origami-frog/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Jumping Frog: Video",
                "href": "https://youtu.be/oi7oitREUBQ?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-rabbit",
            "title": "Rabbit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Rabbit: Instructions",
                "href": "https://drive.google.com/file/d/1NomLFoQW1nE5lvVgJl0L6miMQMjVfjdN/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Rabbit: Video",
                "href": "https://youtu.be/2DfFoVoeYow?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-paper-fortune-teller",
            "title": "Paper Fortune Teller",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Fortune Teller: Instructions",
                "href": "https://www.origamiway.com/paper-fortune-teller/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Paper Fortune Teller: Video",
                "href": "https://youtu.be/g6BrDm9tYbE?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-blinking-eye-origami",
            "title": "Blinking Eye Origami",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Blinking Eye Origami: Instructions",
                "href": "https://www.origamiway.com/origami-blinking-eye/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Blinking Eye Origami: Video",
                "href": "https://youtu.be/a2SU3jRoV_4?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 10,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-fold-up-pup",
            "title": "Fold-Up Pup",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fold-Up Pup: Instructions",
                "href": "https://drive.google.com/file/d/1z7UEucCYYFn6ugdPIl7op3_BHJiRSD6n/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Fold-Up Pup: Video",
                "href": "https://youtu.be/yJfvYKn2C2o?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-paper-tiger",
            "title": "Paper Tiger",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Tiger: Instructions",
                "href": "https://drive.google.com/file/d/1U9Ea9vrCS0fMkjGxWSpKFS6L_o2zn8m0/view",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Paper Tiger: Video",
                "href": "https://youtu.be/3SW-9gnr5R0?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-origami-boat",
            "title": "Origami Boat",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Origami Boat: Instructions",
                "href": "https://www.origamiway.com/origami-boat.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Origami Boat: Video",
                "href": "https://youtu.be/3N7EUi3-PG8?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-4-jumping-frog-level-2",
            "title": "Jumping Frog Level 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Jumping Frog Level 2: Instructions",
                "href": "https://www.origamiway.com/origami-jumping-frog.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Jumping Frog Level 2: Video",
                "href": "https://youtu.be/2dHhvV18eX8?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-5-toon-skelly-mask",
            "title": "Toon Skelly Mask",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Toon Skelly Mask: Instructions",
                "href": "https://drive.google.com/file/d/1Bv9TREvi0IwOanvc3KI-q7eCTxc9N1Uh/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Toon Skelly Mask: Video",
                "href": "https://youtu.be/GFxjC9WY-lY?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 7,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-nasa-starshade",
            "title": "NASA Starshade",
            "items": [
              // Project rows listed under this section.
              {
                "title": "NASA Starshade: Instructions",
                "href": "https://www.jpl.nasa.gov/edu/resources/project/space-origami-make-your-own-starshade/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-flapping-bird",
            "title": "Flapping Bird",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Flapping Bird: Instructions",
                "href": "https://www.origamiway.com/origami-flapping-bird/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Flapping Bird: Video",
                "href": "https://youtu.be/Oh03DJ0dOOc?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-origami-crane",
            "title": "Origami Crane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Origami Crane: Instructions",
                "href": "https://www.origamiway.com/origami-crane.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Origami Crane: Video",
                "href": "https://youtu.be/GC_Szxdqh2Y?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-4-hedgehog",
            "title": "Hedgehog",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Hedgehog: Instructions",
                "href": "https://drive.google.com/file/d/1AURaDMXQaVNFUenuWLPyCnlwDp3fZ-8I/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Hedgehog: Video",
                "href": "https://youtu.be/qmeGnV0rz5E?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-paper-robot",
            "title": "Paper Robot",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Robot: Instructions",
                "href": "https://www.instructables.com/id/Paperbot-Paper-Robot-to-Print-Out-and-Make/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Paper Robot: Video",
                "href": "https://youtu.be/qkUuGVyu3cg?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-cardboard-phone-stand",
            "title": "Cardboard Phone Stand",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cardboard Phone Stand: Instructions",
                "href": "https://i.ytimg.com/vi/eFnLHOCWO3o/maxresdefault.jpg",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Cardboard Phone Stand: Video",
                "href": "https://youtu.be/eFnLHOCWO3o?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-3d-cat-in-box-automata",
            "title": "3D Cat-In-Box Automata",
            "items": [
              // Project rows listed under this section.
              {
                "title": "3D Cat-In-Box Automata",
                "href": "https://youtu.be/c7HKJqTHGbQ",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-red-panda-mask",
            "title": "Red Panda Mask",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Red Panda Mask: Instructions",
                "href": "https://drive.google.com/file/d/18ycBCaeZMxluWkBjNt6LQaDYsNmdP6IZ/view",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Red Panda Mask: Video",
                "href": "https://youtu.be/1EQl9iUae8E?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-paper-basket",
            "title": "Paper Basket",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Basket: Instructions",
                "href": "https://www.instructables.com/Recycled-Paper-Basket/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Paper Basket: Video",
                "href": "https://youtu.be/wWDzSA3X63M?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-walking-paper-mech-warrior-or-robot",
            "title": "Walking Paper Mech Warrior or Robot",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Walking Paper Mech Warrior or Robot: Instructions",
                "href": "https://www.instructables.com/Walking-Papercraft-Mech-Warrior/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Walking Paper Mech Warrior or Robot: Video",
                "href": "https://youtu.be/azixGAjPC1Q?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-rabbit-eating-carrot-automaton",
            "title": "Rabbit eating Carrot Automaton",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Rabbit eating Carrot Automaton : Instructions",
                "href": "https://drive.google.com/file/d/1IHAyK4fpdj5Z5omyYo-24t0BrAIumabE/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Rabbit eating Carrot Automaton : Video",
                "href": "https://youtu.be/SxvO-kNyOOU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 40
    // Total project rows in this category.
  },
  {
    "id": "paper-flight",
    "name": "Paper Flight",
    "description": "Design, fold, and test flying paper builds.",
    "color": "#2596be",
    "image": "assets/PaperFlight_Cover.png",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-basic-paper-airplane",
            "title": "Basic Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Basic Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-dart.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Basic Paper Airplane: Video",
                "href": "https://youtu.be/veyZNyurlwU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-paper-helicopter",
            "title": "Paper Helicopter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Helicopter: Instructions",
                "href": "https://www.origamiway.com/how-to-make-a-paper-helicopter.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Paper Helicopter: Video",
                "href": "https://youtu.be/zTakrjE9yCo?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-nakamura-lock-paper-airplane",
            "title": "Nakamura Lock Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Nakamura Lock Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-nakamura-lock.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Nakamura Lock Paper Airplane: Video",
                "href": "https://youtu.be/P4J4Cj2HcQU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-spy-plane-paper-airplane",
            "title": "Spy Plane Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Spy Plane Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-spy-plane.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Spy Plane Paper Airplane: Video",
                "href": "https://youtu.be/VfWAGxQZaDc?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-professional-paper-airplane",
            "title": "Professional Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Professional Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-professional.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Professional Paper Airplane: Video",
                "href": "https://youtu.be/K2tVuqNxKdw?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-headhunter-paper-airplane",
            "title": "Headhunter Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Headhunter Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-headhunter.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Headhunter Paper Airplane: Video",
                "href": "https://youtu.be/LidNaWlnO5k?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pet-dragon-paper-airplane",
            "title": "Pet Dragon Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pet Dragon Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-pet-dragon.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Pet Dragon Paper Airplane: Video",
                "href": "https://youtu.be/oqeNcIHlePc?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-infinity-arrow-paper-airplane",
            "title": "Infinity Arrow Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Infinity Arrow Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-infinity-arrow.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Infinity Arrow Paper Airplane: Video",
                "href": "https://youtu.be/KIGEBjiBDFM?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-star-crusher-paper-airplane",
            "title": "Star Crusher Paper Airplane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Star Crusher Paper Airplane: Instructions",
                "href": "https://www.origamiway.com/plane-star-crusher.shtml",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Star Crusher Paper Airplane: Video",
                "href": "https://youtu.be/5iqFlEpQs0U?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "popsicle-sticks",
    "name": "Popsicle Sticks",
    "description": "Create structures, mechanisms, toys, and models.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-heroes",
            "title": "Popsicle Stick Heroes",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Heroes: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Superheros/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Heroes: Video",
                "href": "https://www.youtube.com/watch?v=KnpnVe5uxhw",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-playing-cards",
            "title": "Popsicle Stick Playing Cards",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Playing Cards: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Playing-Cards/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Playing Cards: Video",
                "href": "https://youtu.be/4vYWuCej_Rg?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-coaster",
            "title": "Popsicle Stick Coaster",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Coaster: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Coaster/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Coaster: Video",
                "href": "https://youtu.be/sTrp37Dv4hI?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-exploding-popsicle-sticks",
            "title": "Exploding Popsicle Sticks",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Exploding Popsicle Sticks: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Bomb-2/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Exploding Popsicle Sticks: Video",
                "href": "https://youtu.be/GQyGDKklVPU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-icosahedron",
            "title": "Popsicle Stick Icosahedron",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Icosahedron: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Icosahedron/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Icosahedron: Video",
                "href": "https://youtu.be/xL7esJK-b2U?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-newton-s-cradle",
            "title": "Popsicle Stick Newton's Cradle",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Newton's Cradle: Instructions",
                "href": "https://www.instructables.com/Newtons-Cradle-Out-of-Popsicle-Sticks/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-newton-s-cradle",
            "title": "Popsicle Stick Newton's Cradle",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Newton's Cradle: Video",
                "href": "https://youtu.be/DJI3EaBZFZA?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-chain-reaction",
            "title": "Popsicle Stick Chain Reaction",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Chain Reaction: Instructions",
                "href": "https://youtu.be/FGXv-Pp615U",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Chain Reaction: Video",
                "href": "https://youtu.be/r7j7l39ZAsU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-da-vinci-popsicle-stick-bridge",
            "title": "Da Vinci Popsicle Stick Bridge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Da Vinci Popsicle Stick Bridge: Instructions",
                "href": "https://www.instructables.com/Da-Vinci-Popsicle-Stick-Bridge/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Da Vinci Popsicle Stick Bridge: Video",
                "href": "https://youtu.be/mVP0I-nsP_8?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-spoon-catapult-out-of-popsicle-sticks",
            "title": "Spoon Catapult Out Of Popsicle Sticks",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Spoon Catapult Out Of Popsicle Sticks: Video",
                "href": "https://www.youtube.com/watch?v=iKQaTFfhwWo",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-holder",
            "title": "Popsicle Stick Holder",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Holder: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Holder/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Holder: Video",
                "href": "https://youtu.be/gU3AqE5zzTg?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-popsicle-stick-hexagon-shelf",
            "title": "Popsicle Stick Hexagon Shelf",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Hexagon Shelf: Instructions",
                "href": "https://www.instructables.com/Popsicle-Sticks-Hexagon-Shelf/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Hexagon Shelf: Video",
                "href": "https://youtu.be/D61inpGzPUc?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-motorboat",
            "title": "Popsicle Stick Motorboat",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Motorboat: Instructions",
                "href": "https://www.instructables.com/Popsicle-stick-motorboat/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Motorboat: Video",
                "href": "https://youtu.be/dhV3h-Hjpmk?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-birdhouse",
            "title": "Popsicle Stick Birdhouse",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Birdhouse: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Birdhouse/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Birdhouse: Video",
                "href": "https://youtu.be/L_s0M5Z8Nm8?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-popsicle-stick-shutter-lamp-shade",
            "title": "Popsicle Stick Shutter Lamp Shade",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Shutter Lamp Shade: Instructions",
                "href": "https://www.instructables.com/Make-a-Popsicle-Stick-Shutter-Lamp/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Shutter Lamp Shade: Video",
                "href": "https://youtu.be/rLPnaF2Dy7k?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-shutter-lamp-shade",
            "title": "Popsicle Stick Shutter Lamp Shade",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Shutter Lamp Shade: Instructions",
                "href": "https://www.instructables.com/Make-a-Popsicle-Stick-Shutter-Lamp/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Shutter Lamp Shade: Video",
                "href": "https://youtu.be/rLPnaF2Dy7k?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-ring",
            "title": "Popsicle Stick Ring",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Ring: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Ring/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Ring: Video",
                "href": "https://youtu.be/M-oDO7HaenU?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-popsicle-stick-folding-chair",
            "title": "Popsicle Stick Folding Chair",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Folding Chair: Video",
                "href": "https://youtu.be/jAi6S_5krTo?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-popsicle-stick-bridge",
            "title": "Popsicle Stick Bridge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Bridge: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Bridge/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-bridge",
            "title": "Popsicle Stick Bridge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Bridge: Video",
                "href": "https://youtu.be/eGM36jU_364?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-popsicle-stick-helicopter",
            "title": "Popsicle Stick Helicopter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Helicopter: Video",
                "href": "https://youtu.be/LEfU-ke-oVk?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-popsicle-stick-marble-labyrinth",
            "title": "Popsicle Stick Marble Labyrinth",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Marble Labyrinth: Instructions",
                "href": "https://www.instructables.com/Popsicle-Stick-Marble-Labyrinth/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Popsicle Stick Marble Labyrinth: Video",
                "href": "https://youtu.be/1yIxqWfaczg?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 37
    // Total project rows in this category.
  },
  {
    "id": "fiber-art",
    "name": "Fiber Art",
    "description": "Explore yarn, crochet, weaving, and textile projects.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pumpkin-pom-pom",
            "title": "Pumpkin Pom-Pom",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pumpkin Pom-Pom: Instructions",
                "href": "https://www.instructables.com/Easy-Pumpkin-Pom-Pom-With-Your-Hand/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Pumpkin Pom-Pom: Video",
                "href": "https://www.youtube.com/watch?v=oi2NBGKAkH4",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-cardboard-yarn-letter",
            "title": "Cardboard Yarn Letter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cardboard Yarn Letter: Instructions",
                "href": "https://www.instructables.com/Cardboard-Yarn-Letter/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Cardboard Yarn Letter: Video",
                "href": "https://www.youtube.com/watch?v=RIrDDS_DE7E",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-crochet-chain-bracelet",
            "title": "Crochet Chain Bracelet",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Crochet Chain Bracelet: Instructions",
                "href": "https://www.crochetleaf.com/chain-stitch-bracelet.html",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Crochet Chain Bracelet: Video",
                "href": "https://www.youtube.com/watch?v=R49LOKSHw6c",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-yarn-art",
            "title": "Yarn Art",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Yarn Art: Instructions",
                "href": "https://www.instructables.com/Yarn-Art/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Yarn Art: Video",
                "href": "https://www.youtube.com/watch?v=_WQGT7DBeEM",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-yarn-dolls",
            "title": "Yarn Dolls",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Yarn Dolls: Instructions",
                "href": "https://www.instructables.com/Yarn-Dolls-1/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Yarn Dolls: Video",
                "href": "https://www.youtube.com/watch?v=bDGdD21y3nI",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-string-art-with-paperclips",
            "title": "String Art with Paperclips",
            "items": [
              // Project rows listed under this section.
              {
                "title": "String Art with Paperclips",
                "href": "https://www.instructables.com/String-Art-With-Paperclips/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-friendship-bracelet-cable-wrap",
            "title": "Friendship Bracelet Cable Wrap",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Friendship Bracelet Cable Wrap",
                "href": "https://www.instructables.com/Chevron-Friendship-Bracelet-Style-Cable-Wrap-2-Siz/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-geometric-string-art",
            "title": "Geometric String Art",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Geometric String Art",
                "href": "https://www.instructables.com/Geometric-String-Art/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-posable-yarn-friend",
            "title": "Posable Yarn Friend",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Posable Yarn Friend",
                "href": "https://www.instructables.com/Posable-Creepy-Yarn-Friend/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-textured-crochet-square-potholder",
            "title": "Textured Crochet Square Potholder",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Textured Crochet Square Potholder",
                "href": "https://www.instructables.com/Textured-Crochet-Square-Potholder/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-how-to-finger-weave",
            "title": "How to Finger Weave",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How to Finger Weave: Instructions",
                "href": "https://www.instructables.com/How-to-Fingerweave-Something/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "How to Finger Weave: Video",
                "href": "https://www.youtube.com/watch?v=pAhuzHltIDs",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-yarn-jewelry",
            "title": "Yarn Jewelry",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Yarn Jewelry",
                "href": "https://www.instructables.com/Pantry-Yarn-Jewelry/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-trollen-wheel-weaving",
            "title": "Trollen Wheel Weaving",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Trollen Wheel Weaving: Instructions",
                "href": "https://www.instructables.com/Viking-Braids-Make-a-Trollen-Wheel/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Trollen Wheel Weaving: Video",
                "href": "https://www.youtube.com/watch?v=q9giXHTOpYE",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-complete-an-embroidery-project",
            "title": "Complete an Embroidery Project",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Complete an Embroidery Project",
                "href": "https://www.instructables.com/Zodiac-Embroidery/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-skip-the-led-portion",
            "title": "(Skip the LED portion)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "(Skip the LED portion)",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-try-three-different-string-art-patterns-and-make-a-gift-card-using",
            "title": "Try three different String Art Patterns - and make a gift card USING:",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Try three different String Art Patterns - and make a gift card USING:",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-different-shape-string-art-templates",
            "title": "Different Shape String Art Templates",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Different Shape String Art Templates: Instructions",
                "href": "https://www.instructables.com/String-Art-Valentine-Cards-and-Other-Holidays/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Different Shape String Art Templates: Video",
                "href": "https://www.youtube.com/watch?v=IANCecGCzi8",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-5-thread-triangular-art-card",
            "title": "Thread Triangular Art Card",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Thread Triangular Art Card",
                "href": "https://www.instructables.com/silk-thread-triangular-art-card/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-complete-an-independent-embroidery-project-find-your-own-template-online-and-follow-previous",
            "title": "Complete an Independent Embroidery Project -- find your own template online, and follow previous",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Complete an Independent Embroidery Project -- find your own template online, and follow previous instructions",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-3d-string-art-use-popsicle-sticks-and-small-hole-puncher",
            "title": "3d String art - USE POPSICLE STICKS and small hole puncher",
            "items": [
              // Project rows listed under this section.
              {
                "title": "3d String art - USE POPSICLE STICKS and small hole puncher",
                "href": "https://www.instructables.com/Desktop-3D-String-Art/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 28
    // Total project rows in this category.
  },
  {
    "id": "hands-on-science",
    "name": "Hands-On Science",
    "description": "Try experiments, challenges, and physical science builds.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-egg-carton-nursery",
            "title": "Egg Carton Nursery",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Egg Carton Nursery",
                "href": "https://www.pbs.org/parents/crafts-and-experiments/grow-seedlings-in-an-egg-carton",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-counting-over-1000-using-your-fingers",
            "title": "Counting Over 1000 Using Your Fingers",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Counting Over 1000 Using Your Fingers",
                "href": "https://www.youtube.com/watch?v=UixU1oRW64Q",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-weather-station",
            "title": "Weather Station",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Weather Station",
                "href": "https://drive.google.com/file/d/1O0bT2-sGLiS1GLWVZcK0TnYrlvv6KgzX/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-mind-reader",
            "title": "Mind Reader",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Mind Reader",
                "href": "https://drive.google.com/file/d/1BAkhRoxQF9QVhZEfiQyR8pI1HumePlen/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-mind-reader-video-super-helpful",
            "title": "Mind Reader Video! (Super helpful!)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "OR Mind Reader Video! (Super helpful!)",
                "href": "https://youtu.be/cT8sQiUJipg?si=KCTKLWDMNlDT8OVB",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-candy-chromatography",
            "title": "Candy Chromatography",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Candy Chromatography",
                "href": "https://drive.google.com/file/d/126E2Z_B8nCq8JpA4ia0i9Z7Ljf9C5c5M/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-solar-oven",
            "title": "Solar Oven",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Solar Oven",
                "href": "https://drive.google.com/file/d/1CdqLCvGN40ysJ8MRlHPS-KYpw98wJTBY/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-air-blaster",
            "title": "Air Blaster",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Air Blaster",
                "href": "https://drive.google.com/file/d/1bw_uqz1i51PHv6AERrFe1PzzW8kXq6Dr/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-slime",
            "title": "Slime",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Slime: Instructions",
                "href": "https://littlebinsforlittlehands.com/how-to-make-saline-solution-slime-recipe/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "Slime: Video",
                "href": "https://youtu.be/Tb84tJl7eqo?feature=shared",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-parachute-design-video-only",
            "title": "Parachute Design (Video Only)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Parachute Design (Video Only)",
                "href": "https://youtu.be/nmJPOHNUzB4?si=bambm151qwEiCt9A",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-straw-bridge",
            "title": "Straw Bridge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Straw Bridge Instructions",
                "href": "https://drive.google.com/file/d/1akOucflalXWMubu9WXHu8yqtMij3VNQp/view?usp=sharing",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Straw Bridge Video",
                "href": "https://youtu.be/GA93aHRDMD8?si=T6ARglUbQ_lxYkrW",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-comeback-can",
            "title": "Comeback Can",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Comeback Can",
                "href": "https://drive.google.com/file/d/1p_LeN5IUHgKT60g22BXQs2ULIO3PIiS-/view?usp=drive_link",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Comeback Can Video",
                "href": "https://youtu.be/-DPxl7Ik93k?si=YZEzzAqT2VaU9Ybd",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-3-hovercraft",
            "title": "Hovercraft",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Hovercraft Instructions",
                "href": "https://www.scienceworld.ca/resource/balloon-hovercraft/",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Hovercraft Video",
                "href": "https://youtu.be/iujDMqL_448?si=jOtEGtRhQTBBIndM",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-paddle-boat",
            "title": "Paddle Boat",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paddle Boat",
                "href": "https://drive.google.com/file/d/1kUiCEnFz4VwxUuQrxV0K4cSak_jYUZmF/view?usp=drive_link",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Paddle Boat Video",
                "href": "https://youtu.be/PlANTECC-QA?si=IjY30kQVq7ImkQF4",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-newspaper-fort",
            "title": "Newspaper Fort",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Newspaper Fort",
                "href": "https://drive.google.com/file/d/1B03vIpJrk3OWNSD1uPnig3MQiapCKm17/view?usp=drive_link",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Newspaper Fort Video",
                "href": "https://youtu.be/TV2Fpq8s9Ws?si=BnylX105FK3kOvVv",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-hot-air-balloon",
            "title": "Hot Air Balloon",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Hot Air Balloon",
                "href": "https://drive.google.com/file/d/1FnFf9_HAUDPQ54H20Ek2kcH-Cag_g3ck/view?usp=drive_link",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Hot Air Balloon Video",
                "href": "https://youtu.be/2t170Kb9Fz8?si=LAdqHX2kMDYUcCY6",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-stomp-rocket",
            "title": "Stomp Rocket",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Stomp Rocket",
                "href": "https://drive.google.com/file/d/1WkN1uyYV0oMvkOrO9HOMc5VE12K6A4hU/view?usp=drive_link",
                "type": "resource",
                "image": ""
              },
              {
                "title": "OR Stomp Rocket Video",
                "href": "https://youtu.be/9oZSBSYB1_o?si=Sis4McMY5Nzs_scN",
                "type": "video",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-hot-glue-3d-water-printing",
            "title": "Hot Glue 3D Water Printing",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Hot Glue 3D Water Printing",
                "href": "https://docs.google.com/presentation/d/1-7Fn-l2FIu0Lt7eOuAriNNzYmrxwMMgcfrxu_Cpru7A/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 26
    // Total project rows in this category.
  },
  {
    "id": "3d-printing-101-prusa-mini",
    "name": "3D Printing 101 (Prusa Mini)",
    "description": "Design, slice, and print beginner 3D models.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. Design a Mesh Model in Sculptris",
                "href": "https://drive.google.com/open?id=1-px_dgqD27YoiMfLxrYysuD_sWbwHZ1FkKEOCjB0bJw",
                "type": "resource",
                "image": ""
              },
              {
                "title": "1. Design a Mesh Model on the Web",
                "href": "https://docs.google.com/document/d/14Lbh7DkWVNFkcI0WmlF898Ifk5mKU0IWm6ZgqRxkWF4/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 2
            // Number of project rows in this section.
          },
          {
            "id": "group-2-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2. Slice a Model with Prusa Slicer",
                "href": "https://docs.google.com/document/d/1upXN7Sn65urau1wNAFDMXtyxqXqN8KoHL3yEZmVe_bE/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-part-3",
            "title": "Part 3",
            "items": [
              // Project rows listed under this section.
              {
                "title": "3. Operating a PrusaMini",
                "href": "https://docs.google.com/document/d/1NUxdjrleygNWIulcpqfp5QnaQXQO5-6ylX8NuEyR6Wk/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. TinkerCAD Setup",
                "href": "https://docs.google.com/document/d/1nZVrv83v7UY9wUDPerOByM0jOgnmNomrNawanWTDaIM/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2. Intro to TinkerCAD",
                "href": "https://docs.google.com/document/d/1Abz3T5SNf5l3LclQbwUUS0Vc3Dx8z3_yeSVAjtm5QHM/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-lithophane-in-flashprint",
            "title": "Lithophane in FlashPrint",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Lithophane in FlashPrint",
                "href": "https://drive.google.com/open?id=13ZW3JMHMBOVJriVCoxsfjZ0r6-7dP7ujKPQG5CWSI-g",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-extruded-traced-bitmap",
            "title": "Extruded Traced Bitmap",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Extruded Traced Bitmap",
                "href": "https://drive.google.com/open?id=1denVgeSQwDsPCYnQwmxJzHssLNW7ZehRVtUEQJTUacs",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-tinkercad-game-piece",
            "title": "TinkerCAD Game Piece",
            "items": [
              // Project rows listed under this section.
              {
                "title": "TinkerCAD Game Piece",
                "href": "https://drive.google.com/open?id=1ge0KJgVUiaSCQYDNslE1qczOuyljhAzrinsVNRIjujU",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-custom-phone-stand",
            "title": "Custom Phone Stand",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Custom Phone Stand",
                "href": "https://docs.google.com/document/d/1OA3BuftxTsMSqYeQtNtpnxNZfOsnoQrMqopognIWf8A/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-custom-ring-in-tinkercad",
            "title": "Custom Ring in TinkerCad",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Custom Ring in TinkerCad",
                "href": "https://docs.google.com/document/d/18khDTj27AIhp4tYXK_6c7QlxLbZoTUa9SemmDa7N9a8/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-custom-brick",
            "title": "Custom BRICK",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Custom BRICK",
                "href": "https://drive.google.com/open?id=10kkz3Lm5hm-grF-s-gbYWJ6ll6kzLK1Ocu-vE1_MU1k",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-custom-cookie-cutter",
            "title": "Custom Cookie Cutter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Custom Cookie Cutter",
                "href": "https://docs.google.com/document/d/1-bPp7kwhK2IwONXSVg0EuA-Bo0SGaFJ0eQahFJPu_iQ/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-head-scan",
            "title": "Head Scan",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Head Scan",
                "href": "https://drive.google.com/open?id=1_4dD4H4J8Eq4S0eCQBxYwxvhclI2bIXJS9febTysEe8",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-altered-head-scan",
            "title": "Altered Head Scan",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Altered Head Scan",
                "href": "https://drive.google.com/open?id=1iE-VRqtvK6xV4u7fhxch5KTYHn3k-Npcq9Pc5g1zKZM",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-assemble-a-screwless-gear-cube",
            "title": "Assemble a Screwless Gear Cube",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Assemble a Screwless Gear Cube",
                "href": "https://docs.google.com/document/d/12ymvx_31TNeZy9h9VrEQz7n7j1GnxK6o1-z7bdzuhms/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-custom-secret-message-container",
            "title": "Custom Secret Message Container",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Custom Secret Message Container",
                "href": "https://docs.google.com/document/d/1_uasA_Za-9T3Y_kVKt417sgiWPoqRAt1uy8vS634EAE/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 17
    // Total project rows in this category.
  },
  {
    "id": "vinyl-cutting-cameo",
    "name": "Vinyl Cutting (Cameo)",
    "description": "Create decals and cut designs with vinyl tools.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-introduction-to-silhouette-studio",
            "title": "Introduction to Silhouette Studio",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Introduction to Silhouette Studio",
                "href": "https://docs.google.com/document/d/1xWcqfcxSU7U8cQhd8wbiB2uzbfazvSmO/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-how-to-operate-a-cameo-3-vinyl-cutter",
            "title": "How to Operate a Cameo 3 Vinyl Cutter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How to Operate a Cameo 3 Vinyl Cutter",
                "href": "https://docs.google.com/document/d/1-RKGi-l_QMrycU-2nXIYaGFFazrayhTo/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-how-to-operate-a-cameo-4-vinyl-cutter",
            "title": "How to Operate a Cameo 4 Vinyl Cutter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How to Operate a Cameo 4 Vinyl Cutter",
                "href": "https://docs.google.com/document/d/1ihm51BJbhbJg2W8rZuadxG_umpEW2MvX/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-a-name-decal",
            "title": "Make a Name Decal",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make a Name Decal",
                "href": "https://docs.google.com/document/d/14xUjEdv4Ih1zdgg8OBxuz8Hnm6tmL_vb/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-how-to-apply-a-vinly-decal",
            "title": "How To Apply a Vinly Decal",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How To Apply a Vinly Decal",
                "href": "https://docs.google.com/document/d/1D5qDopoflQ4PM_qTRfv1qhc95A-UN3uL/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-trace-an-image-in-silhouette-studio",
            "title": "Trace an Image in Silhouette Studio",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Trace an Image in Silhouette Studio",
                "href": "https://docs.google.com/document/d/1RkdDKCjzJTwM2dAsCoNgLksI2viHa0Wv/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-a-heat-transfer-design",
            "title": "Make a Heat Transfer Design",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make a Heat Transfer Design",
                "href": "https://docs.google.com/document/d/1ToUxPWMPBVwPsauaU0m3mG77AzXnkT1K/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-how-to-operate-the-heat-press",
            "title": "How to Operate the Heat Press",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How to Operate the Heat Press",
                "href": "https://docs.google.com/document/d/1gZX95vsLJHtNTK8G22r12zt5wgir5w67/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-a-2-color-decal",
            "title": "Make a 2-Color Decal",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make a 2-Color Decal",
                "href": "https://docs.google.com/document/d/1UwbTx0Rt6fbwfz9Cgue8KVpuds2Tfzok/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-3-color-decal",
            "title": "3+ Color Decal",
            "items": [
              // Project rows listed under this section.
              {
                "title": "3+ Color Decal",
                "href": "https://docs.google.com/document/d/1Tc6vsuXBtJXbRC0qWsRk_SMfgxlO4TZA/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-draw-cut-with-the-vinyl-cutter",
            "title": "Draw & Cut with the Vinyl Cutter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Draw & Cut with the Vinyl Cutter",
                "href": "https://docs.google.com/document/d/1_Luof-f1lRxi2Ww00u1SrfLTtiCy3-Kv/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 11
    // Total project rows in this category.
  },
  {
    "id": "laser-cutting-101-muse",
    "name": "Laser Cutting 101 (Muse)",
    "description": "Learn laser safety, files, and cut projects.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-muse-laser-cutter-manual",
            "title": "Muse Laser Cutter Manual**",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Muse Laser Cutter Manual**",
                "href": "https://2882208.fs1.hubspotusercontent-na1.net/hubfs/2882208/Muse%20Core%20Manual%201-23.pdf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-operate-the-muse-laser-cutter",
            "title": "Operate the Muse Laser Cutter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Operate the Muse Laser Cutter",
                "href": "https://docs.google.com/document/d/1CFgD1smsIa1M34kqKHDH5plTjC3YVqDN/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-fab-lab-fridge-magnet-test",
            "title": "Fab Lab Fridge Magnet Test",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fab Lab Fridge Magnet Test",
                "href": "https://docs.google.com/document/d/1hbh0TUZPwn0uB8zmLZwz4rizc4T6Y1c9/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-name-tag",
            "title": "Name Tag",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Name Tag",
                "href": "https://docs.google.com/document/d/1dxPYF_T5Pq23CgZOXMrVNRpgbaIYGmwt/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-keychain",
            "title": "Keychain",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Keychain",
                "href": "https://docs.google.com/document/d/1W617q1dH_ef_9ndTik_k4LD4Yff653xU/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-coaster",
            "title": "Coaster",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Coaster",
                "href": "https://docs.google.com/document/d/1hdf0m-t-J9EF1vZiVz8-334qMj6Cln7o/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-tic-tac-toe-set",
            "title": "Tic-Tac-Toe Set",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Tic-Tac-Toe Set",
                "href": "https://docs.google.com/document/d/1drz-Kdm0iqL8p7vVZE50z6SV-4EK_34A/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-trace-an-image-in-inkscape",
            "title": "Trace an Image in Inkscape",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Trace an Image in Inkscape",
                "href": "https://docs.google.com/document/d/1afeIQDA7kRPlD-9IfBcTANHKL46yaDRD/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-fake-stained-glass",
            "title": "Fake Stained Glass",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fake Stained Glass",
                "href": "https://docs.google.com/document/d/1ljoF3uKHa_1_Y_2vFOQcaqLoh-8SUohu/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2.5D Chess Pawn",
                "href": "https://docs.google.com/document/d/1uaXBzE9SLDNS5D8MlvX8VyoH_RXwIeQx/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-laser-cut-diorama",
            "title": "Laser Cut Diorama",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Laser Cut Diorama",
                "href": "https://docs.google.com/document/d/1D2PAy1wVQnP-YMVjyJR-xYKg5pLk8fMI/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-maker-case-box",
            "title": "Maker Case Box",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Maker Case Box",
                "href": "https://docs.google.com/document/d/1O50opFhpsbVBoNCJ7VcfRnx4B2VxCJvB/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-laser-cut-spirograph",
            "title": "Laser Cut Spirograph",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Laser Cut Spirograph",
                "href": "https://docs.google.com/document/d/1Kx1n7EJ7s3bKNhFk0jXMh2GU8BqYi3GJ/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-laser-cut-pantograph",
            "title": "Laser Cut Pantograph",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Laser Cut Pantograph",
                "href": "https://docs.google.com/document/d/1CVJ4ADuGut4tn-0go_BBH5LIO91tQ-bI/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-laser-cut-gear-box",
            "title": "Laser Cut Gear Box",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Laser Cut Gear Box",
                "href": "https://docs.google.com/document/d/1r0OgOqTrdItJCz_fC6pdsqJGu5BRHDCC/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 15
    // Total project rows in this category.
  },
  {
    "id": "digital-embroidery-101-brother-pe800",
    "name": "Digital Embroidery 101 (Brother PE800)",
    "description": "Hoop, thread, stitch, and finish embroidery projects.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-hooping-fabric-for-embroidery-machine",
            "title": "Hooping Fabric for Embroidery Machine",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Hooping Fabric for Embroidery Machine",
                "href": "https://docs.google.com/document/d/19TWrhT59vthZ-x71_YN8poeZSdChET5S/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-threading-the-pe800-video",
            "title": "Threading the PE800 (Video)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Threading the PE800 (Video)",
                "href": "https://youtu.be/3voxF1cbyS4?t=103",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-embroider-your-name",
            "title": "Embroider Your Name",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Embroider Your Name",
                "href": "https://docs.google.com/document/d/1qqNh_5BpfkRn3KvBBr757DzXfSKWn-UA/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-multicolor-patch",
            "title": "Multicolor Patch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Multicolor Patch",
                "href": "https://docs.google.com/document/d/1DVfj7wUGo8kYKOKMwN-xWRHMnbcu9ntZ/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-multipart-patch",
            "title": "Multipart Patch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Multipart Patch",
                "href": "https://docs.google.com/document/d/1RuZHY8ptb9WwbXFFGKUn3NmpZ9ctryqI/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-add-an-applique",
            "title": "Add an Applique",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Add an Applique",
                "href": "https://docs.google.com/document/d/1IOvIZfmdBF1oxf-nHhZwZMhucqp9r5xU/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-puffy-embroidery",
            "title": "Puffy Embroidery",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Puffy Embroidery",
                "href": "https://docs.google.com/document/d/1-CEx8VKVYznZnVA5EttqWfSQJqTHD5_N/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-sewing-an-external-file",
            "title": "Sewing an External File",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Sewing an External File",
                "href": "https://docs.google.com/document/d/1fUh9h8QnOMm4nQWjyDDRYclUBADgCAA3/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 8
    // Total project rows in this category.
  },
  {
    "id": "electronics-101",
    "name": "Electronics 101",
    "description": "Build circuits, lights, and electronics experiments.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. TinkerCAD Setup",
                "href": "https://docs.google.com/document/d/1eOUcYsAs_NhbfDqq8WUAjei6RKpMsr62/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2. Simple Lamp",
                "href": "https://docs.google.com/document/d/1t6vEsXuo7HqfO3QZWdquD8A6IVD0W4ne/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-cu-tape-torch",
            "title": "Cu Tape Torch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cu Tape Torch",
                "href": "https://drive.google.com/file/d/0B66Qe-o5qktELTBNUkVMZ3VURlE/view?usp=sharing&resourcekey=0-oVcVrUPm1xeobeRPUknBww",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-paper-parallel-circuit",
            "title": "Paper Parallel Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Paper Parallel Circuit",
                "href": "https://docs.google.com/document/d/1LhzaRdE7mulAwX0aXnoeS19P7CnkcKsy/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-cu-tape-torch-instructable-w",
            "title": "Cu Tape Torch Instructable w/",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cu Tape Torch Instructable w/ video",
                "href": "https://www.instructables.com/Circuit-Torch/",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-simple-led-circuit",
            "title": "Simple LED Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Simple LED Circuit",
                "href": "https://docs.google.com/document/d/1sxRiEsIo-oyoy2xQXOsAdUqUbkZXUBD4/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-resistor-code-wheel",
            "title": "Resistor Code Wheel",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Resistor Code Wheel",
                "href": "https://drive.google.com/open?id=1hvufvKUJdoDnYfYvqjZStlwFDl4UnQ-X",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-an-led-series-circuit",
            "title": "Make an LED Series Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make an LED Series Circuit",
                "href": "https://docs.google.com/document/d/1ZPS6lfO9SXX24JczBVcq7Cqc2-XPw_ET/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-make-a-variable-resistor",
            "title": "Make a Variable Resistor",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make a Variable Resistor",
                "href": "https://docs.google.com/document/d/1ywzIkCgD4mzWq1Pguh6pPOIqp3t2iukU/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-led-stop-light-circuit",
            "title": "LED Stop Light Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "LED Stop Light Circuit",
                "href": "https://docs.google.com/document/d/1s7n_SGLBTTlPKZySVZilAk1ws8q7HlQk/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-rgb-led-circuit",
            "title": "RGB LED Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "RGB LED Circuit",
                "href": "https://docs.google.com/document/d/1S_Iga0mpq_59w8hgqPI5iW379MQ-Yy0w/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-rgb-led-cu-tape-circuit",
            "title": "RGB LED Cu Tape Circuit",
            "items": [
              // Project rows listed under this section.
              {
                "title": "RGB LED Cu Tape Circuit",
                "href": "https://docs.google.com/document/d/1G72STvxmJHXbFFFu8L5aLgF5cucDzMC0/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-how-a-capacitor-works",
            "title": "How a Capacitor Works",
            "items": [
              // Project rows listed under this section.
              {
                "title": "How a Capacitor Works",
                "href": "https://docs.google.com/document/d/1Ili_5KdyCszRVXzE9q-lnFbVPZ95H1xZ/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-555-blinking-light",
            "title": "555 Blinking Light",
            "items": [
              // Project rows listed under this section.
              {
                "title": "555 Blinking Light",
                "href": "https://docs.google.com/document/d/1j0SF_83C7RftXOv9LFS2dyUrataAOEXf/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-555-photo-theremin",
            "title": "555 Photo Theremin",
            "items": [
              // Project rows listed under this section.
              {
                "title": "555 Photo Theremin",
                "href": "https://docs.google.com/document/d/1Xp465RMT_ucVlGSQLFQeh7BdEgJGra1j/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-555-octave-keyboard",
            "title": "555 Octave Keyboard",
            "items": [
              // Project rows listed under this section.
              {
                "title": "555 Octave Keyboard",
                "href": "https://docs.google.com/document/d/1cIlo2cDxQ_rc0dzkP_IOSqML8NCB3rIW/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 16
    // Total project rows in this category.
  },
  {
    "id": "mechatronics",
    "name": "Mechatronics",
    "description": "Combine mechanisms, motion, gears, and controls.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-gluetorial-sampler",
            "title": "Gluetorial Sampler",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Gluetorial Sampler",
                "href": "https://docs.google.com/document/d/1Ut_yKCfCMPef_R_wOPdUl2SlnA50EHWe/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-slider-crank-diagram",
            "title": "Slider Crank Diagram",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Slider Crank Diagram",
                "href": "https://docs.google.com/presentation/d/16HNDgOB5AO-L7WBvDG6eI5t304hz-fNXTQxHrFqQlZ8/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-slider-crank-assembly-pics",
            "title": "Slider Crank Assembly Pics",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Slider Crank Assembly Pics",
                "href": "https://photos.app.goo.gl/hw9x96uq7vUj682H9",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-cam-and-follower",
            "title": "Cam and Follower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cam and Follower",
                "href": "https://docs.google.com/presentation/d/1M6siUEXQSTYWsuqMaWkWy-U8uVWBzDuhjr71Ipd_Tgs/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-corregated-gears",
            "title": "Corregated Gears",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Corregated Gears",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-cage-gears",
            "title": "Cage Gears",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Cage Gears",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-laser-cut-spirograph",
            "title": "Laser Cut Spirograph",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Laser Cut Spirograph",
                "href": "https://docs.google.com/document/d/1ZwWYj9OczMhbOE9G3NO_n5U6EHvN4-MU/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-arduino-programming-servo",
            "title": "Arduino Programming -Servo",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Arduino Programming -Servo",
                "href": "https://learn.adafruit.com/adafruit-arduino-lesson-14-servo-motors?view=all",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-your-own-autonomous-robot",
            "title": "Create your own Autonomous Robot",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create your own Autonomous Robot",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "engineering-101",
    "name": "Engineering 101",
    "description": "Design, build, test, and improve engineering solutions.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-what-is-engineering",
            "title": "What is Engineering?",
            "items": [
              // Project rows listed under this section.
              {
                "title": "What is Engineering?",
                "href": "https://www.youtube.com/watch?v=btGYcizV0iI&list=PL8dPuuaLjXtO4A_tL6DLZRotxEb114cMR&t=0s",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-straw-rocket",
            "title": "Build a Straw Rocket",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Straw Rocket",
                "href": "https://www.jpl.nasa.gov/edu/learn/project/make-a-straw-rocket/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-toothpick-tower",
            "title": "Build a Toothpick Tower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Toothpick Tower",
                "href": "http://www.crscience.org/pdf/Marshmallow_toothpick_challenge.pdf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-popsicle-stick-harmonica",
            "title": "Popsicle Stick Harmonica",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Popsicle Stick Harmonica",
                "href": "http://www.housingaforest.com/popsicle-stick-harmonica/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-diy-spin-drum",
            "title": "DIY Spin Drum",
            "items": [
              // Project rows listed under this section.
              {
                "title": "DIY Spin Drum",
                "href": "https://www.minted.com/julep/2014/07/14/kids-party-ideas-diy-musical-instrument/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-rubber-band-guitar",
            "title": "Rubber Band Guitar",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Rubber Band Guitar",
                "href": "http://www.makeit-loveit.com/2011/03/mister-make-it-and-love-it-series.html",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-spaghetti-bridge",
            "title": "Build a Spaghetti Bridge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Spaghetti Bridge",
                "href": "https://www.wikihow.com/Build-a-Spaghetti-Bridge",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-build-a-mini-siege-engine",
            "title": "Build a Mini Siege Engine",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Mini Siege Engine",
                "href": "https://www.instructables.com/id/Mini-Siege-Engines/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-rubber-band-car",
            "title": "Build a Rubber Band Car",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Rubber Band Car",
                "href": "https://yourmoderndad.com/diy-rubber-band-racer/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-try-the-egg-drop-challenge",
            "title": "Try the Egg Drop Challenge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Try the Egg Drop Challenge",
                "href": "https://buggyandbuddy.com/stem-kids-egg-drop-project/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-water-balloon-catapult",
            "title": "Water Balloon Catapult",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Water Balloon Catapult",
                "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG12_Catapult.pdf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-tensegrity-flying-man",
            "title": "Tensegrity Flying Man",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Tensegrity Flying Man",
                "href": "https://drive.google.com/file/d/1MMonoBmbj4pA3U2bIDErOIUexkple7JQ/view?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-propeller-toy",
            "title": "Build a Propeller Toy",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Propeller Toy",
                "href": "https://www.instructables.com/Hand-powered-vintage-propeller-toy/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-build-a-propeller-car",
            "title": "Build a Propeller Car",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Propeller Car",
                "href": "https://www.instructables.com/id/Propeller-Powered-Car/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-build-a-dragonfly-helicopter",
            "title": "Build a Dragonfly Helicopter",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Dragonfly Helicopter",
                "href": "https://sciencetoymaker.org/dragonfly-helicopter/copter-common-materials/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-balloon-racer",
            "title": "Balloon Racer",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Balloon Racer",
                "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG13_Racer.pdf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-rubber-band-plane",
            "title": "Build a Rubber Band Plane",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a Rubber Band Plane",
                "href": "https://www.instructables.com/id/Rubber-Band-Powered-Aeroplane/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-rube-goldberg-machine",
            "title": "Rube Goldberg Machine",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Rube Goldberg Machine",
                "href": "https://drive.google.com/file/d/1k4xgxYNdcNUu5eqj4_BAfpkjvlnhQgoi/view?usp=drive_link",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-scribble-bot",
            "title": "Scribble Bot",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Scribble Bot",
                "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG15_space_bot.pdf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 19
    // Total project rows in this category.
  },
  {
    "id": "turtle-stitch",
    "name": "Turtle Stitch",
    "description": "Use code-driven stitching and shape-based embroidery.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 6,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-turtlestitch-account",
            "title": "Create TurtleStitch Account",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create TurtleStitch Account",
                "href": "https://docs.google.com/document/d/1zqNidmzZgIfzBh2yuugQ50Agv4yEVt4N/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-start",
            "title": "Start",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Start",
                "href": "https://docs.google.com/drawings/d/1-uHPoLC0UX1xvWMZKjSxvbsvp-k7fOMVudr4jzaf5F0/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-comment",
            "title": "Comment",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Comment",
                "href": "https://docs.google.com/drawings/d/1x1SmrL5EtZ5Yzwd9zbRAVJFq465e96Xh7k0Cx1G-Jw0/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-line",
            "title": "Line",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Line",
                "href": "https://docs.google.com/drawings/d/1qQT8kosxr7BZy6vssIXgCgH3bNfsLgRUAOBcS6idk-U/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-5-embroidery-stitch-types",
            "title": "Embroidery (Stitch Types)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Embroidery (Stitch Types)",
                "href": "https://docs.google.com/drawings/d/1i3q6qMgaayyaLjo2IC1hQa49hoxbAqSzq4SMCsXNRMU/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-6-file-format",
            "title": "File Format",
            "items": [
              // Project rows listed under this section.
              {
                "title": "File Format",
                "href": "https://docs.google.com/drawings/d/1nLwpzhCSMjUBZnhaBLIrXrPoBfRqU3i23w159QC81as/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-dimensions",
            "title": "Dimensions",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Dimensions",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-square",
            "title": "Square",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Square",
                "href": "https://docs.google.com/drawings/d/1sXr-WP-nuB0_w2C3fjDDId3xprYm8h2tqNWrs5FG5Go/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-circle",
            "title": "Circle",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Circle",
                "href": "https://docs.google.com/drawings/d/1GVQNEhL23_O-mgRGsQMmUZT0C6ET5dcKclpbZSKftR0/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-jump-stitch",
            "title": "Jump Stitch",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Jump Stitch",
                "href": "https://docs.google.com/drawings/d/1Ai9GZJPne_Y2klYSPBWYpv8NQBClTw0PjSCNaWUiZAg/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-block",
            "title": "Block",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Block",
                "href": "https://docs.google.com/drawings/d/1rKU7QiAU4R58gZ_htZsBuL3MOOsGYcj3SEXsOQpvA7Y/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-flower",
            "title": "Flower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Flower",
                "href": "https://docs.google.com/drawings/d/1GQNN4V6d8tXpIkobUtDnCC_EQPqNHhKQfsohl64Cjk8/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-pinwheel",
            "title": "Pinwheel",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pinwheel",
                "href": "https://docs.google.com/drawings/d/1ov00gFlmOrkyJAowCP2Q7aNajTkDJksH7Mcm96PCpdw/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-little-large",
            "title": "Little & Large",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Little & Large",
                "href": "https://docs.google.com/drawings/d/13Ct2MMdffsHZDHRLVIMILhW_eW-7mN7RFQmkil2BC1w/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-star",
            "title": "Star",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Star",
                "href": "https://docs.google.com/drawings/d/1lU7kCTsR4nKMEUtM5YgEXLe78qjFGlymwdOJ9A8A2VY/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-reset",
            "title": "Reset",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Reset",
                "href": "https://docs.google.com/drawings/d/1_SArTrXTLdDXrL6JQiy1pKtx-Q-BsiP_oLB00zCDSKA/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-triangle-spiral",
            "title": "Triangle Spiral",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Triangle Spiral",
                "href": "https://docs.google.com/drawings/d/1VAEY7Ewmn_zX7cjmAFo5-W2JtLKJJbx2fAr4IZc2bhw/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-spiral-challenge",
            "title": "Spiral Challenge",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Spiral Challenge",
                "href": "https://docs.google.com/drawings/d/1NBk9wr1xm88aX6Qs7Gi_P9LprBvTz5cxrwr9293Jp_s/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-density",
            "title": "Density",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Density",
                "href": "https://docs.google.com/drawings/d/12aUaC9w3VJKcBLAsvKhr5_t270RUwgLw8LIMaBu-dwo/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-fractal-tree",
            "title": "Fractal Tree",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fractal Tree",
                "href": "https://docs.google.com/drawings/d/1NXVwLRsZARla142sQRdeH58kNO7j1rqDm7aQCV1KJd4/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 20
    // Total project rows in this category.
  },
  {
    "id": "block-coding-101-scratch",
    "name": "Block Coding 101 (scratch)",
    "description": "Create animations, stories, games, and interactive code.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-getting-started",
            "title": "Getting Started",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Getting Started",
                "href": "https://docs.google.com/document/d/13h4EK2Rpu6Km96zMcQBqSIBJJVBXsei6/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 5,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-creating-animations",
            "title": "Creating Animations",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Creating Animations",
                "href": "https://docs.google.com/document/d/14S33M8FEPCjVKApkH58kDCXhohkgXOFA/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-creating-art",
            "title": "Creating Art",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Creating Art",
                "href": "https://docs.google.com/document/d/1JvQ0ECFePFdoNw_wCM5utE-WBQTGwqRW/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-creating-music",
            "title": "Creating Music",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Creating Music",
                "href": "https://docs.google.com/document/d/1qVlWeijstxURBSt492prJrz8iliEZYG0/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-creating-games",
            "title": "Creating Games",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Creating Games",
                "href": "https://docs.google.com/document/d/1Sz4EbNaD_G7nJi2h7BgZcgXmG7Fm--mz/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-5-creating-stories",
            "title": "Creating Stories",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Creating Stories",
                "href": "https://docs.google.com/document/d/1HPrmWclfelbzwD_eTH4RxPOW-1E1Vb0A/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 4,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-talking-tales",
            "title": "Talking Tales",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Talking Tales",
                "href": "https://docs.google.com/document/d/1k4m15sPw9s45uFCIbkKiVnW92gLTpkmf/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-animate-a-character",
            "title": "Animate A Character",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Animate A Character",
                "href": "https://docs.google.com/document/d/1jbpp2bzgKT-pF-pDcUza_E493VldeyMS/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-create-animations-that-talk",
            "title": "Create Animations That Talk",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create Animations That Talk",
                "href": "https://docs.google.com/document/d/16YsotkA_OI0Fw1km8DR8oS16g8BoUIOO/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-4-create-a-story",
            "title": "Create A Story",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create A Story",
                "href": "https://docs.google.com/document/d/17M8EByW5HooIosIQfvx-zz0Xtl1p4uX2/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-code-a-cartoon",
            "title": "Code a Cartoon",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Code a Cartoon",
                "href": "https://docs.google.com/document/d/1wgKr2BJtbjDlYzX5n21WlDZjJe-SND73/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-change-size",
            "title": "Change Size",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Change Size",
                "href": "https://docs.google.com/document/d/1Hpnmek0HLztmtaESASCG0mqiQIuIBKee/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-video-sensing",
            "title": "Video Sensing",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Video Sensing",
                "href": "https://docs.google.com/document/d/1gWug_Nf1mZMw5ATMlWzU0wjBHsinoUox/edit",
                "type": "video",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pong-game",
            "title": "Pong Game",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pong Game",
                "href": "https://docs.google.com/document/d/18fnU7uyihVNTblfUJEDiH0wSgJ1Nd5ra/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-animate-an-adventure-game",
            "title": "Animate an Adventure Game",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Animate an Adventure Game",
                "href": "https://docs.google.com/document/d/1bCDnYcWVfkNaeFdcyIc_qVqCT6AaokUu/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-imagine-a-world",
            "title": "Imagine a World",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Imagine a World",
                "href": "https://docs.google.com/document/d/1iEdsogsZrLmAEmLmr8C7DB2EPuGg8UoA/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-check-out-some-of-the-code-made-by-other-makers",
            "title": "Check out some of the code made by other makers!",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Check out some of the code made by other makers!",
                "href": "https://docs.google.com/document/d/1yit0Z6teBUKhRMHCQd7CnutXRShxh0cz/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-your-very-own-and-share-it",
            "title": "Create your very own and share it!",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create your very own and share it!",
                "href": "https://docs.google.com/document/d/1JUsbLTMXUavC93ovxRrKqxaG_FePn7F5/edit",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "pygamer",
    "name": "Pygamer",
    "description": "Build and test handheld MakeCode Arcade projects.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-get-a-pygamer-usb-cord-and-lion-battery",
            "title": "Get a Pygamer, USB cord, and LiOn Battery",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Get a Pygamer, USB cord, and LiOn Battery",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-optional-sign-into-makecode-using-your-clever-microsoft-or-google-account",
            "title": "(optional) Sign into MakeCode Using your Clever, Microsoft, or Google Account",
            "items": [
              // Project rows listed under this section.
              {
                "title": "(optional) Sign into MakeCode Using your Clever, Microsoft, or Google Account",
                "href": "https://arcade.makecode.com/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-a-chasing-pizza-game",
            "title": "Create a chasing Pizza Game",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create a chasing Pizza Game",
                "href": "https://arcade.makecode.com/tutorials/chase-the-pizza",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-load-the-above-code-into-the-pygamer",
            "title": "Load the above code into the PyGamer",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Load the above code into the PyGamer",
                "href": "https://learn.adafruit.com/adafruit-pygamer/load-makecode-game-on-pybadge",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-complete-one-whole-level-of-the-arcade-skills-map-pidegeon-level",
            "title": "Complete One whole level of the ARCADE SKILLS MAP (Pidegeon Level)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Complete One whole level of the ARCADE SKILLS MAP (Pidegeon Level)",
                "href": "https://arcade.makecode.com/--skillmap",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-complete-two-whole-levels-of-beginner-skills-map-theater-curtain-level",
            "title": "complete two whole levels of Beginner Skills Map (Theater Curtain Level)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "complete two whole levels of Beginner Skills Map (Theater Curtain Level)",
                "href": "https://arcade.makecode.com/--skillmap",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-complete-all-the-levels-of-the-beginner-skills-map-kaiju-dinosaur-level",
            "title": "Complete all the levels of the Beginner Skills Map (Kaiju Dinosaur Level)",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Complete all the levels of the Beginner Skills Map (Kaiju Dinosaur Level)",
                "href": "https://arcade.makecode.com/--skillmap",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-a-game-that-incorporates-the-lights-at-the-bottom-of-the-pygamer",
            "title": "Create a Game that incorporates the Lights at the Bottom of the Pygamer.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create a Game that incorporates the Lights at the Bottom of the Pygamer.",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-set-the-pygamer-to-control-an-external-light-or-buzzer",
            "title": "Set the PyGamer to control an external light or Buzzer.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Set the PyGamer to control an external light or Buzzer.",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "circuit-playground",
    "name": "Circuit Playground",
    "description": "Program sensors, lights, sounds, and devices.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-name-3-things-a-circuit-playground-can-do",
            "title": "Name 3 things a Circuit Playground can do",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Name 3 things a Circuit Playground can do",
                "href": "https://youtu.be/xel0AHvQgvk?si=uZ-nT3ra1mexTdIQ",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-connect-your-circuit-playground-to-a-laptop",
            "title": "Connect your Circuit Playground to a laptop",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Connect your Circuit Playground to a laptop",
                "href": "https://youtu.be/auOcAoL4_Ik?si=n6Vh_TGL6ftcgFcohttps://youtu.be/auOcAoL4_Ik?si=n6Vh_TGL6ftcgFco",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-https-makecode-adafruit-com",
            "title": "https://makecode.adafruit.com/",
            "items": [
              // Project rows listed under this section.
              {
                "title": "https://makecode.adafruit.com/",
                "href": "https://makecode.adafruit.com/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-turn-your-circuit-playground-into-a-siren-the-siren-tutorial-in-make-code",
            "title": "Turn your Circuit Playground into a Siren the Siren tutorial in Make Code.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Turn your Circuit Playground into a Siren the Siren tutorial in Make Code.",
                "href": "https://makecode.adafruit.com/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-write-a-program-to-make-the-lights-change-color-when-the-circuit-playground-is-tilted",
            "title": "Write a program to make the lights change color when the Circuit playground is tilted.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Write a program to make the lights change color when the Circuit playground is tilted.",
                "href": "https://youtu.be/f9FI3s9DDMo",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-use-the-pins-on-circuit-playground-to-make-the-leds-flash",
            "title": "Use the pins on Circuit Playground to make the LEDs Flash.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Use the pins on Circuit Playground to make the LEDs Flash.",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 0,
        // Number of project rows in this section.
        "groups": []
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-your-circuit-playground-control-a-servo",
            "title": "Make your circuit playground control a servo.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make your circuit playground control a servo.",
                "href": "https://youtu.be/cofElsolYk4?si=-wvwdtvg4Qq5itJf",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-write-a-program-that-causes-one-circuit-playground-start-a-program-on-another-circuit-playground",
            "title": "Write a program that causes one Circuit Playground start a program on another Circuit Playground",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Write a program that causes one Circuit Playground start a program on another Circuit Playground",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-write-an-original-program-and-share-it-with-a-friend",
            "title": "Write an original program and share it with a friend",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Write an original program and share it with a friend",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 0,
        // Number of project rows in this section.
        "groups": []
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "lego",
    "name": "Lego",
    "description": "Prototype towers, vehicles, structures, and robots.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-the-tallest-tower-of-stacked-bricks-you-can",
            "title": "Build the tallest tower of stacked bricks you can",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build the tallest tower of stacked bricks you can",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-build-a-house-using-interlocking-bricks",
            "title": "Build a house using interlocking bricks",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Build a house using interlocking bricks",
                "href": "https://www.wikihow.com/Build-a-LEGO-House",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-design-a-building-for-a-base-on-mars",
            "title": "Design a building for a Base on Mars",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Design a building for a Base on Mars",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-design-a-vehicle-rover-for-mars",
            "title": "Design a vehicle/rover for Mars",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Design a vehicle/rover for Mars",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-design-a-vehicle-that-can-win-a-down-hill-race",
            "title": "Design a vehicle that can win a down hill race",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Design a vehicle that can win a down hill race",
                "href": "https://youtube.com/shorts/u3SwgxKLUwE?si=T1NWpevHyK8IOrT7",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-make-a-2-dimensional-picture-using-lego-blocks",
            "title": "Make a 2 dimensional picture using Lego Blocks",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Make a 2 dimensional picture using Lego Blocks",
                "href": "https://youtu.be/3dY-kvNcDt8?si=BtbMzZqth4iseDhK",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-1-connect-a-lego-spike-brick-to-your-laptop",
            "title": "1) Connect a Lego Spike Brick to your Laptop",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1) Connect a Lego Spike Brick to your Laptop",
                "href": "https://spike.legoeducation.com/prime/start/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-2-learn-to-program-a-lego-spike-block-to-roll-in-a-square",
            "title": "2) Learn to program a Lego Spike Block to roll in a square.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2) Learn to program a Lego Spike Block to roll in a square.",
                "href": "https://spike.legoeducation.com/prime/start/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-design-a-robot-that-does-a-particular-job",
            "title": "Design a robot that does a particular job.",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Design a robot that does a particular job.",
                "href": "#",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-create-a-lego-rover-robot-using-lego-spike",
            "title": "Create a Lego Rover/ Robot using Lego Spike",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Create a Lego Rover/ Robot using Lego Spike",
                "href": "https://youtu.be/8MXGh5VE9Bs?si=cRypSLi1tK6CrvkL",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 10
    // Total project rows in this category.
  },
  {
    "id": "pipe-cleaners",
    "name": "Pipe Cleaners",
    "description": "Make flexible figures, flowers, and sculptures.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pipe-cleaner-people",
            "title": "Pipe Cleaner People",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner People",
                "href": "https://www.youtube.com/watch?v=zVkDp9sIjsU",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-pipe-cleaner-rings",
            "title": "Pipe Cleaner Rings",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner Rings",
                "href": "https://www.youtube.com/watch?v=xX58LNA6wu4",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-fish",
            "title": "Fish",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Fish",
                "href": "https://www.youtube.com/watch?v=bwO7NZpR8pw",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-pipe-cleaner-flower",
            "title": "Pipe Cleaner Flower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner Flower",
                "href": "https://www.instructables.com/Pipe-Cleaner-Flower-Mothers-Day-Craft/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pipe-cleaner-jellyfish",
            "title": "Pipe Cleaner Jellyfish",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner Jellyfish",
                "href": "https://www.youtube.com/watch?v=vlJFI1GfQOc&t=79s",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-dragonfly",
            "title": "Dragonfly",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Dragonfly",
                "href": "https://www.youtube.com/shorts/tVX0EyBYvVA",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-cupcake",
            "title": "CupCake",
            "items": [
              // Project rows listed under this section.
              {
                "title": "CupCake",
                "href": "https://www.youtube.com/watch?v=QRHa3E53l3A",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-sword",
            "title": "Sword",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Sword",
                "href": "https://www.youtube.com/watch?v=IZry2TYbC3s",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pipe-cleaner-crown",
            "title": "Pipe Cleaner Crown",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner Crown",
                "href": "https://www.youtube.com/watch?v=IaJAUm2Joks",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-bubble-wand",
            "title": "Bubble Wand",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Bubble Wand",
                "href": "https://www.youtube.com/watch?v=Vr_jrkd48Wc",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-spider",
            "title": "Spider",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Spider",
                "href": "https://www.youtube.com/watch?v=ZvVvupxVEuw",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-ice-cream-cone-keychain",
            "title": "Ice Cream Cone Keychain",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Ice Cream Cone Keychain",
                "href": "https://www.youtube.com/watch?v=q6DJt7ASzWQ",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-pipe-cleaner-dragon",
            "title": "Pipe Cleaner Dragon",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Pipe Cleaner Dragon",
                "href": "https://frugalfun4boys.com/pipe-cleaner-dragons/",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 3,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-5nof-cupcake",
            "title": "5NOF Cupcake",
            "items": [
              // Project rows listed under this section.
              {
                "title": "5NOF Cupcake",
                "href": "https://www.youtube.com/watch?v=-BhZbZNmmWA",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-giant-sunflower",
            "title": "Giant Sunflower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Giant Sunflower",
                "href": "https://www.youtube.com/watch?v=f6d1ds6GMR8",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-3-giant-flower",
            "title": "Giant Flower",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Giant Flower",
                "href": "https://www.youtube.com/watch?v=0fqAcTThF3c&t=70s",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 16
    // Total project rows in this category.
  },
  {
    "id": "3d-pen",
    "name": "3D Pen",
    "description": "Draw, repair, and sculpt with a handheld 3D pen.",
    "color": "#2596be",
    "image": "",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-part-1",
            "title": "Part 1",
            "items": [
              // Project rows listed under this section.
              {
                "title": "1. Introduction",
                "href": "https://docs.google.com/document/d/1erM-dn8OncLACIcfSAgK9LGNiq96H-6OdDo398lAU5Y/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-part-2",
            "title": "Part 2",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2. Your Name",
                "href": "https://docs.google.com/document/d/19JXLtQG7nXubzQjywlamAlZ3v3UBPWrHYinv6TQ9KKs/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-basic-shape-outlines",
            "title": "Basic Shape Outlines",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Basic Shape Outlines",
                "href": "https://docs.google.com/document/d/1HAyzb1gmbR-r82TWfSrvEerTvJH4CRrVAVd9QEviOxY/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-fix-a-3d-print",
            "title": "FIx a 3D Print",
            "items": [
              // Project rows listed under this section.
              {
                "title": "FIx a 3D Print",
                "href": "https://docs.google.com/document/d/1yS_LKKFY341gP8LiCus3zHDoCF7BvIg3tzqDRYIU0iM/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Orange",
        "id": "orange",
        "count": 2,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-2d-drawing",
            "title": "2D Drawing",
            "items": [
              // Project rows listed under this section.
              {
                "title": "2D Drawing",
                "href": "https://docs.google.com/document/d/1eiqnsKYFODBw_7ibTZXMK6Noh-TRsrimBCCEGgnahTg/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          },
          {
            "id": "group-2-tetrahedron",
            "title": "Tetrahedron",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Tetrahedron",
                "href": "https://docs.google.com/document/d/1CPvkqD8q4THyaOTdbSDBAyyThqqebgVn2ZAEjjyg6Z4/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Green",
        "id": "green",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-filled-cube",
            "title": "Filled Cube",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Filled Cube",
                "href": "https://docs.google.com/document/d/1OrYR_tQXhRpL-pzGRqhM1wpJkVe0Qn3SX2nfcqfvWv0/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Blue",
        "id": "blue",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-touch-stone",
            "title": "Touch Stone",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Touch Stone",
                "href": "https://docs.google.com/document/d/1pyKAVGxhhAdIlh24G8zPcXu-yl7hciWN7HIAZTUs5jA/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Purple",
        "id": "purple",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-finishing",
            "title": "Finishing",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Finishing",
                "href": "https://docs.google.com/document/d/1NSM3ctQB_YjTxcnqILpmdczwvcTzf_UzTbY3WXN8j0Q/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Brown",
        "id": "brown",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-replicate-desk-item",
            "title": "Replicate Desk Item",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Replicate Desk Item",
                "href": "https://docs.google.com/document/d/1Qi-7Ht8BglI8NinXAua0_Wb_IHTuOMyyq4kfGSgvSLc/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      },
      {
        "name": "Black",
        "id": "black",
        "count": 1,
        // Number of project rows in this section.
        "groups": [
          // Rectangular group sections shown inside this belt.
          {
            "id": "group-1-human-animal-sculpture",
            "title": "Human/Animal Sculpture",
            "items": [
              // Project rows listed under this section.
              {
                "title": "Human/Animal Sculpture",
                "href": "https://docs.google.com/document/d/1fBGlOvx904XiWFO-_pvBuOdYJy2JgbG19urWJj5I7A0/edit?usp=sharing",
                "type": "resource",
                "image": ""
              }
            ],
            "count": 1
            // Number of project rows in this section.
          }
        ]
      }
    ],
    "count": 11
    // Total project rows in this category.
  }
];

/* This helper creates a new HTML element. Example in plain English: el('span', 'cardName', 'Notebooking') means: "Create a span, give it the CSS class cardName, and put Notebooking inside it." This saves us from repeating the same three or four JavaScript lines every time we need to create a piece of the page. */
function el(tag, className, text) {
  /* document.createElement tells the browser to make a new HTML tag. The tag could be "a", "span", "button", "section", or another HTML element. */
  const node = document.createElement(tag);

  /* If a class name was provided, attach it to the new element. CSS uses class names to decide how the element should look. */
  if (className) node.className = className;

  /* If text was provided, place that text inside the new element. textContent is safer than raw HTML because it treats the value as words, not as code. */
  if (text !== undefined) node.textContent = text;

  /* Return the finished element so another function can place it on the page. */
  return node;
}

/* This helper creates the reusable image slot used in the header, quick links, category cards, and project rows. */
function placeholder(className, label, src = placeholderSrc) {
  /* Create a normal image element, the same kind of tag as <img> in HTML. */
  const img = document.createElement('img');

  /* Give the image a CSS class so styles.css knows how large it should be. */
  img.className = className;

  /* Point the image to the matched asset when one exists, otherwise use the shared imageSlot file. */
  img.src = src || placeholderSrc;

  /* If a matched file ever fails to load, fall back to the shared placeholder instead of showing a broken image icon. */
  img.onerror = () => {
    img.onerror = null;
    img.src = placeholderSrc;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
  };

  /* Use the label as alt text only when a real asset exists; decorative placeholders stay hidden from assistive technology. */
  img.alt = src ? label : '';

  /* Lazy loading tells the browser it can wait to load images until they are needed. This is helpful when the page has many rows. */
  img.loading = 'lazy';

  /* aria-hidden hides decorative placeholders from assistive technology while allowing real matched images to be described. */
  if (!src) img.setAttribute('aria-hidden', 'true');

  /* Save a short internal label on the image element. */
  img.dataset.imageLabel = label || 'Image placeholder';

  /* Return the image so it can be inserted into a button, card, or project row. */
  return img;
}

/* This helper makes a link open in a new browser tab safely. target = "_blank" opens a new tab. rel = "noopener noreferrer" is a security best practice for new-tab links. */
function setExternal(anchor) {
  if (anchor.getAttribute('href') && anchor.getAttribute('href').startsWith('#')) return;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
}

/* This turns a value like "white" into a CSS class like "beltWhite". */
function beltClassName(beltId) {
  return `belt${beltId.charAt(0).toUpperCase()}${beltId.slice(1)}`;
}

/* This turns a resource type like "video" into a CSS class like "projectVideo". */
function projectTypeClassName(type) {
  return `project${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

/* This builds one clickable resource or video row so grouped and ungrouped items look exactly the same. */
function createProjectRow(item) {
  /* Create the project link row. The project type class controls the consistent resource or video label styling. */
  const anchor = el('a', `project ${projectTypeClassName(item.type)}`);

  /* Use the item's link when present, otherwise keep the row on the current page. */
  anchor.href = item.href || '#';
  setExternal(anchor);

  /* Add an image slot only for resources, because video rows should stay text-only instead of showing a placeholder. */
  if (item.type === 'resource') anchor.appendChild(placeholder('projectImage', `${item.title} image`, item.image));

  /* Create the text area for the row: title on top, type label below. */
  const copy = el('span', 'projectCopy');
  copy.append(el('span', 'projectName', item.title), el('span', 'projectType', item.type));

  /* Put the text area into the link, then return the completed row to whichever section is building it. */
  anchor.appendChild(copy);
  return anchor;
}

/* This writes item counts in normal English, so one independent resource says "1 item" instead of "1 items". */
function itemCountLabel(count) {
  /* Convert missing or unusual count values into a number so the label still renders predictably. */
  const total = Number(count) || 0;

  /* Return the count with the correct singular or plural word. */
  return `${total} ${total === 1 ? 'item' : 'items'}`;
}

/* This builds the quickLink buttons at the top of the page. It looks for the empty <div id="quickLinks"></div> in index.html, then loops through the quickLinks list and adds one button for each item. */
function renderQuickLinks() {
  /* Find the quickLinks container from index.html. If this id changes in the HTML, this line must change too. */
  const nav = document.getElementById('quickLinks');

  /* Go through each shortcut in quickLinks and build a matching clickable link. */
  quickLinks.forEach((link) => {
    /* Create an <a> link and give it two classes: quickLink gives it the button shape, and qlColor gives it the color. */
    const anchor = el('a', `quickLink ${link.colorClass}`);

    /* Set the link destination, then make it open in a new tab safely. */
    anchor.href = link.href;
    setExternal(anchor);

    /* Put an image slot and the button label inside the link. */
    anchor.append(placeholder('quickLinkImage', `${link.label} image`, link.image), document.createTextNode(link.label));

    /* Add the completed quickLink button to the page. */
    nav.appendChild(anchor);
  });
}

/* This builds every category card on the page. It looks for <main id="categoryGrid"></main> in index.html, then uses the campData list to create cards, belt sections, and project/resource rows. */
function renderCards() {
  /* Find the empty card grid from index.html. All generated category cards will be placed inside this element. */
  const grid = document.getElementById('categoryGrid');

  /* Loop through every category from the workbook data. One category becomes one expandable card. */
  campData.forEach((category) => {
    /* Create the outer card container. The CSS variable --categoryColor gives this specific card its accent color. */
    const card = el('article', 'card');
    card.style.setProperty('--categoryColor', category.color);

    /* Create the clickable card header button. This is what visitors click to open or close a category. */
    const button = el('button', 'cardBtn');
    button.type = 'button';

    /* These accessibility attributes tell assistive technology that the button controls a dropdown area and whether that dropdown is currently open. */
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', category.id);

    /* Add the blank category image slot to the button. */
    button.appendChild(placeholder('cardImage', `${category.name} image`, category.image));

    /* Create the text area inside the button: category name plus resource count. */
    const labelWrap = el('span', 'cardLabel');
    labelWrap.append(el('span', 'cardName', category.name), el('span', 'cardMeta', `${category.count} resources across belt levels`));

    /* Add the label area and downArrow indicator to the button. */
    button.append(labelWrap, el('span', 'chevron', 'v'));

    /* Create the dropdown area that will hold the description and belt sections. It starts hidden because styles.css hides cardDropdown until it has the open class. */
    const dropdown = el('div', 'cardDropdown');
    dropdown.id = category.id;

    /* Add the short category description at the top of the opened card. */
    const intro = el('p', 'cardDescription', category.description);
    dropdown.appendChild(intro);

    /* Loop through each belt in this category. Empty belt levels are skipped so the page does not show empty sections. */
    category.belts.forEach((belt) => {
      const groups = belt.groups && belt.groups.length ? belt.groups : [{ id: 'resources', title: 'Resources', items: belt.items || [], count: belt.count || 0 }];
      if (!groups.some((group) => group.items && group.items.length)) return;

      /* Create one belt section, such as "White Belt" or "Blue Belt". The beltWhite, beltBlue, etc. class controls the heading color. */
      const section = el('section', `beltSection ${beltClassName(belt.id)}`);

      /* Create the clickable belt heading row and include the number of items in that belt. */
      const heading = el('button', 'beltHeading');
      heading.type = 'button';
      const beltPanelId = `${category.id}-${belt.id}`;
      heading.setAttribute('aria-expanded', 'false');
      heading.setAttribute('aria-controls', beltPanelId);
      heading.append(el('span', 'beltName', `${belt.name} Belt`), el('span', 'beltCount', `${belt.count} items`), el('span', 'beltChevron', 'v'));
      section.appendChild(heading);

      /* Create a container for the part and series sections inside this belt. */
      const list = el('div', 'projectList');
      list.id = beltPanelId;

      /* Loop through every generated part or series group, such as Part 1, Part 2, Jumping Frog, or Rabbit. */
      groups.forEach((group) => {
        if (!group.items || !group.items.length) return;

        /* Create the wrapper that keeps independent resources and multi-item series aligned consistently inside the belt. */
        const groupSection = el('section', `resourceGroup ${group.count === 1 ? 'singleItemGroup' : 'seriesGroup'}`);

        /* Create the rectangular heading for the part, series, or independent one-item section. */
        const groupHeading = el('div', 'groupHeading');
        groupHeading.append(el('span', 'groupName', group.title), el('span', 'groupCount', itemCountLabel(group.count)));
        groupSection.appendChild(groupHeading);

        /* Create the visible row list for the resources and videos inside this specific group. */
        const groupList = el('div', 'groupList');

        /* Loop through every resource or video in this group and create one clickable row for each item. */
        group.items.forEach((item) => {
          /* Add the completed project row into this rectangular group section. */
          groupList.appendChild(createProjectRow(item));
        });

        /* Add the grouped rows to the section, then add the section to the belt list. */
        groupSection.appendChild(groupList);
        list.appendChild(groupSection);
      });

      /* Add the project list to the belt section, then add the belt section to the card dropdown. */
      section.appendChild(list);
      heading.addEventListener('click', () => toggleDropdown(heading, list));
      dropdown.appendChild(section);
    });

    /* Connect the button click to the dropdown behavior. When someone clicks the button, toggleDropdown opens or closes the list. */
    button.addEventListener('click', () => toggleDropdown(button, dropdown));

    /* Put the button and dropdown inside the card, then place the completed card into the grid on the page. */
    card.append(button, dropdown);
    grid.appendChild(card);
  });
}

/* This opens or closes one category card. The function does not create new content. It only adds or removes CSS classes so styles.css can show or hide the dropdown. */
function toggleDropdown(button, dropdown) {
  /* Toggle the open class on the dropdown. classList.toggle returns true if the class is now present and false if it was removed. */
  const open = dropdown.classList.toggle('open');

  /* Match the button's visual state to the dropdown state. This rotates the arrow because styles.css watches for .cardBtn.open. */
  button.classList.toggle('open', open);

  /* Update the accessibility state so assistive technology knows whether the dropdown is open. */
  button.setAttribute('aria-expanded', String(open));
}

/* These two lines actually start the page. First we render the quick links. Then we render the category cards. */
renderQuickLinks();
renderCards();
