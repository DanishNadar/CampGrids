/* This JS file manages the project data and builds the quick links, category cards, belt sections, and project rows. */

/* Shared image slot used anywhere a card, quick link, or project row needs a visual. */
const placeholderSrc = 'assets/placeholder.jpg';

/* This list controls the shortcut buttons at the top of the page. Each item has a label: the words shown on the button, href: the page or document the button opens, color: the CSS color class used for the button */
const quickLinks = [
  { label: 'Camp Portal', href: 'https://sites.google.com/view/fablabcamps/home', colorClass: 'qlBlue' },
  { label: 'Young Makers', href: 'https://sites.google.com/view/fablabcamps/young-makers', colorClass: 'qlGreen' },
  { label: 'Bessie Coleman Flight', href: 'https://sites.google.com/view/fablabcamps/bessie-coleman-flight', colorClass: 'qlOrange' },
  { label: 'Camp Grid Sheet', href: 'https://docs.google.com/spreadsheets/d/13XSBDHuYkVl0Fgng4vzA6WdHMrDKTD67eLoiP7Y3z4E/edit?usp=sharing', colorClass: 'qlPurple' },
  { label: 'TinkerCAD Portal', href: 'http://www.tinkercad.com/joinclass/HQPGBBSGD', colorClass: 'qlTeal' },
  { label: 'Scratch Usernames', href: 'https://docs.google.com/spreadsheets/d/1Xmc2GbvR3rrxGoHHxbuT-zOhzrYbOokWfGLSPpNzNk0/edit?usp=sharing', colorClass: 'qlRed' }
];

/* Curriculum data: each category has a name, color, description, belt sections, project titles, links, and resource types. Add new projects in CampGrids.xlsx, then run update_campgrids.bat to rebuild this block. */
const campData = [
  {
    "id": "notebooking",
    "name": "Notebooking",
    "description": "Sketch, record, reflect, and document maker work.",
    "color": "#f7c948",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Notebook",
            "href": "https://docs.google.com/document/d/1pR6EuSTzPdrjEb9VxxsBYX7IazxlkjfPehHYuQlSgCM/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Written Notes",
            "href": "https://drive.google.com/open?id=11-4Olb4yIMDuacq34q_M2-NCTFGE8F2BTXxTuiKSPAc",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Simple Sketching",
            "href": "https://docs.google.com/document/d/1MhpQloHlCB4Wn8asrfQImHiphBb5rfIrVwWenKiMX24/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "The Innovation Process",
            "href": "https://docs.google.com/presentation/d/16xBTtXYuueqzE3l3q3A3edR0jkKQmpY2hgTx67OmQ8w/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Notebook Rough Sketch",
            "href": "https://drive.google.com/open?id=1aRGnYDaspwjgyWHhU1GOp7IMsLQZeWaBvKbXfdslLOg",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Notebook Detail Sketch",
            "href": "https://drive.google.com/open?id=15KiIzkpOb8_odfrRTeadHHxGLxmw2ugRQerdM7kJc5s",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Sketch Model",
            "href": "https://drive.google.com/open?id=15NXBMsNSQi01KFgzgrY-GwT2-yyIsa7U1DzxTN6ImAs",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Recording Data",
            "href": "https://docs.google.com/document/d/1bKx6wJshooVdf_zz6WHUsWKLmMczZWH88G_hvAS-apI",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 8
    // Total project rows in this category.
  },
  {
    "id": "origami-figure",
    "name": "Origami (Figure)",
    "description": "Fold animals, figures, and paper characters.",
    "color": "#ff8a3d",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. Make a Square Sheet of Paper: Instructions",
            "href": "https://docs.google.com/document/d/1CTuENjsKcSaLcZ0kOcMBGBpEvwTz58j0/edit",
            "type": "instructions"
          },
          {
            "title": "1. Make a Square Sheet of Paper: Video",
            "href": "https://www.youtube.com/watch?v=_5pWN0O2i2I",
            "type": "video"
          },
          {
            "title": "2. Make a Whale: Instructions",
            "href": "https://origami.me/whale/",
            "type": "instructions"
          },
          {
            "title": "2. Make a Whale :Videos",
            "href": "https://www.youtube.com/watch?v=8dLe5dS4b60",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Angel Fish: Instructions",
            "href": "http://origami.me/angelfish/",
            "type": "instructions"
          },
          {
            "title": "Angel Fish: Video",
            "href": "https://www.youtube.com/watch?v=NxUV-Rao4TM",
            "type": "video"
          },
          {
            "title": "Cat Face: Instructions",
            "href": "http://origami.me/cat-face/",
            "type": "instructions"
          },
          {
            "title": "Cat Face: Video",
            "href": "https://www.youtube.com/watch?v=lLmtLKVMoAs",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Simple Frog: Instructions",
            "href": "https://www.origamiway.com/easy-origami-frog.shtml",
            "type": "instructions"
          },
          {
            "title": "Simple Frog: Video",
            "href": "https://www.youtube.com/watch?v=1kZjq8f8Mpo",
            "type": "video"
          },
          {
            "title": "Cicada: Instructions",
            "href": "http://origami.me/cicada/",
            "type": "instructions"
          },
          {
            "title": "Cicada: Video",
            "href": "https://www.youtube.com/watch?v=HkHX18n4tak",
            "type": "video"
          },
          {
            "title": "Fox: Instructions",
            "href": "http://origami.me/fox/",
            "type": "instructions"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Fox: Video",
            "href": "https://www.youtube.com/watch?v=DJ23zgGAg6c",
            "type": "video"
          },
          {
            "title": "Jumping Frog: Instructions",
            "href": "https://www.origamiway.com/origami-jumping-frog.shtml",
            "type": "instructions"
          },
          {
            "title": "Jumping Frog: Video",
            "href": "https://www.youtube.com/watch?v=1kZjq8f8Mpo",
            "type": "video"
          },
          {
            "title": "Beetle: Instructions",
            "href": "http://origami.me/beetle/",
            "type": "instructions"
          },
          {
            "title": "Beetle: Video",
            "href": "https://www.youtube.com/watch?v=Hdj_Vr7dOok",
            "type": "video"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Flapping Bird: Instructions",
            "href": "https://www.origamiway.com/origami-flapping-bird.shtml",
            "type": "instructions"
          },
          {
            "title": "Flapping Bird: Video",
            "href": "https://www.youtube.com/watch?v=DD1M3VrNSt4",
            "type": "video"
          },
          {
            "title": "Traditional Crane: Instructions",
            "href": "https://www.origamiway.com/origami-crane.shtml",
            "type": "instructions"
          },
          {
            "title": "Traditional Crane: Video",
            "href": "https://www.youtube.com/watch?v=KfnyopxdJXQ",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Iris: Instructions",
            "href": "http://origami.me/iris/",
            "type": "instructions"
          },
          {
            "title": "Iris: Video",
            "href": "https://www.youtube.com/watch?v=QY9LE0bDFxY",
            "type": "video"
          },
          {
            "title": "Lion: Instructions",
            "href": "http://origami.me/lion/",
            "type": "instructions"
          },
          {
            "title": "Lion: Video",
            "href": "https://www.youtube.com/watch?v=XSM0DTx7nZE",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Seal: Instructions",
            "href": "http://origami.me/seal/",
            "type": "instructions"
          },
          {
            "title": "Seal: Video",
            "href": "https://www.youtube.com/watch?v=U3SH59mHURA",
            "type": "video"
          },
          {
            "title": "Rabbit: Instructions",
            "href": "http://origami.me/rabbit/",
            "type": "instructions"
          },
          {
            "title": "Rabbit: Video",
            "href": "https://www.youtube.com/watch?v=6QqBvy_yO_M",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Parrot: Instructions",
            "href": "http://origami.me/parrot/",
            "type": "instructions"
          },
          {
            "title": "Parrot: Video*",
            "href": "https://www.youtube.com/watch?v=lchxv2BOg6M",
            "type": "video"
          },
          {
            "title": "Advanced Frog: Instructions",
            "href": "http://origami.me/traditional-frog/",
            "type": "instructions"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      }
    ],
    "count": 33
    // Total project rows in this category.
  },
  {
    "id": "origami-modular",
    "name": "Origami (Modular)",
    "description": "Build geometric forms from repeated paper units.",
    "color": "#ff6b6b",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. Make a Square Sheet of Paper: Instructions",
            "href": "https://docs.google.com/document/d/1CTuENjsKcSaLcZ0kOcMBGBpEvwTz58j0/edit",
            "type": "instructions"
          },
          {
            "title": "1. Make a Square Sheet of Paper: Videos",
            "href": "https://www.youtube.com/watch?v=_5pWN0O2i2I",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Water Bomb Base: Instructions",
            "href": "https://docs.google.com/document/d/1S-UltC3lh4c3PVYMkcn3Qb50i0pxZzjc/edit",
            "type": "instructions"
          },
          {
            "title": "Water Bomb Base: Video",
            "href": "https://www.youtube.com/watch?v=yl1rjHml2Gc",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Sunken Octahedron: Instructions",
            "href": "https://docs.google.com/document/d/1vToFCTdHDbcYkI2YD79fDYa8ZD2H_EOt/edit",
            "type": "instructions"
          },
          {
            "title": "Sunken Octahedron: Video",
            "href": "https://www.youtube.com/watch?v=qWk8WVvWrM8",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Cris-Cros Cube: Instructions",
            "href": "https://docs.google.com/document/d/1BbSvuZO7bEbNm6923o-tipX7Dhoq7-7u/edit",
            "type": "instructions"
          },
          {
            "title": "Cris-Cros Cube: Videos *",
            "href": "https://www.youtube.com/watch?v=HQhBOLABSkg",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Twelve Pointed Star: Instructions",
            "href": "https://docs.google.com/document/d/1Sa6N65Hoc1WIvCtPzR795ZfquvDLlkfF/edit",
            "type": "instructions"
          },
          {
            "title": "Twelve Pointed Star: Video",
            "href": "https://youtu.be/HQhBOLABSkg?t=9m23s",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Fold a Sonobe Module: Instructions",
            "href": "https://docs.google.com/document/d/1dgxhr5qlsitkkgiaY6wlGuSyngiL0EHh/edit",
            "type": "instructions"
          },
          {
            "title": "Fold a Sonobe Module: Video",
            "href": "https://www.youtube.com/watch?v=TKGW2W168H0",
            "type": "video"
          },
          {
            "title": "Transforming Ninja Star: Instructions",
            "href": "https://www.origamiway.com/origami-transforming-ninja-star.shtml",
            "type": "instructions"
          },
          {
            "title": "Transforming Ninja Star: Video",
            "href": "https://www.youtube.com/watch?v=n01fsCDWAUc",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Assemble Simple Sonobe Models: Instructions",
            "href": "https://docs.google.com/document/d/1XRv37KP5nvnkTTfHkhthh6XgjaloLgzj/edit",
            "type": "instructions"
          },
          {
            "title": "Assemble Simple Sonobe Models: Videos",
            "href": "https://www.youtube.com/watch?v=WasvUFXmACk",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Assemble a Complex Sonobe Model: Instructions",
            "href": "https://docs.google.com/document/d/1QRrfGQSA7azPW3cT8g7CkTuAKP8LWXd0/edit",
            "type": "instructions"
          },
          {
            "title": "Assemble a Complex Sonobe Model: Video",
            "href": "https://www.youtube.com/watch?v=rWWyDVBV-qc",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "paper-craft",
    "name": "Paper Craft",
    "description": "Make playful paper models and moving paper projects.",
    "color": "#d95fcd",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Simple Stand-Up Cat: Instructions",
            "href": "https://drive.google.com/file/d/1FIz1vNG9k89cLokLkq1VQYo6z3GPGxTD/view",
            "type": "instructions"
          },
          {
            "title": "Simple Stand-Up Cat: Video",
            "href": "https://youtu.be/6L_gQ1-Tno8?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Jumping Frog: Instructions",
            "href": "https://www.origamiway.com/easy-origami-frog/",
            "type": "instructions"
          },
          {
            "title": "Jumping Frog: Video",
            "href": "https://youtu.be/oi7oitREUBQ?feature=shared",
            "type": "video"
          },
          {
            "title": "Rabbit: Instructions",
            "href": "https://drive.google.com/file/d/1NomLFoQW1nE5lvVgJl0L6miMQMjVfjdN/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "Rabbit: Video",
            "href": "https://youtu.be/2DfFoVoeYow?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Paper Fortune Teller: Instructions",
            "href": "https://www.origamiway.com/paper-fortune-teller/",
            "type": "instructions"
          },
          {
            "title": "Paper Fortune Teller: Video",
            "href": "https://youtu.be/g6BrDm9tYbE?feature=shared",
            "type": "video"
          },
          {
            "title": "Blinking Eye Origami: Instructions",
            "href": "https://www.origamiway.com/origami-blinking-eye/",
            "type": "instructions"
          },
          {
            "title": "Blinking Eye Origami: Video",
            "href": "https://youtu.be/a2SU3jRoV_4?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Fold-Up Pup: Instructions",
            "href": "https://drive.google.com/file/d/1z7UEucCYYFn6ugdPIl7op3_BHJiRSD6n/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "Fold-Up Pup: Video",
            "href": "https://youtu.be/yJfvYKn2C2o?feature=shared",
            "type": "video"
          },
          {
            "title": "Paper Tiger: Instructions",
            "href": "https://drive.google.com/file/d/1U9Ea9vrCS0fMkjGxWSpKFS6L_o2zn8m0/view",
            "type": "instructions"
          },
          {
            "title": "Paper Tiger: Video",
            "href": "https://youtu.be/3SW-9gnr5R0?feature=shared",
            "type": "video"
          },
          {
            "title": "Origami Boat: Instructions",
            "href": "https://www.origamiway.com/origami-boat.shtml",
            "type": "instructions"
          },
          {
            "title": "Origami Boat: Video",
            "href": "https://youtu.be/3N7EUi3-PG8?feature=shared",
            "type": "video"
          },
          {
            "title": "Jumping Frog Level 2: Instructions",
            "href": "https://www.origamiway.com/origami-jumping-frog.shtml",
            "type": "instructions"
          },
          {
            "title": "Jumping Frog Level 2: Video",
            "href": "https://youtu.be/2dHhvV18eX8?feature=shared",
            "type": "video"
          },
          {
            "title": "Toon Skelly Mask: Instructions",
            "href": "https://drive.google.com/file/d/1Bv9TREvi0IwOanvc3KI-q7eCTxc9N1Uh/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "Toon Skelly Mask: Video",
            "href": "https://youtu.be/GFxjC9WY-lY?feature=shared",
            "type": "video"
          }
        ],
        "count": 10
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "NASA Starshade: Instructions",
            "href": "https://www.jpl.nasa.gov/edu/resources/project/space-origami-make-your-own-starshade/",
            "type": "instructions"
          },
          {
            "title": "Flapping Bird: Instructions",
            "href": "https://www.origamiway.com/origami-flapping-bird/",
            "type": "instructions"
          },
          {
            "title": "Flapping Bird: Video",
            "href": "https://youtu.be/Oh03DJ0dOOc?feature=shared",
            "type": "video"
          },
          {
            "title": "Origami Crane: Instructions",
            "href": "https://www.origamiway.com/origami-crane.shtml",
            "type": "instructions"
          },
          {
            "title": "Origami Crane: Video",
            "href": "https://youtu.be/GC_Szxdqh2Y?feature=shared",
            "type": "video"
          },
          {
            "title": "Hedgehog: Instructions",
            "href": "https://drive.google.com/file/d/1AURaDMXQaVNFUenuWLPyCnlwDp3fZ-8I/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "Hedgehog: Video",
            "href": "https://youtu.be/qmeGnV0rz5E?feature=shared",
            "type": "video"
          }
        ],
        "count": 7
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Paper Robot: Instructions",
            "href": "https://www.instructables.com/id/Paperbot-Paper-Robot-to-Print-Out-and-Make/",
            "type": "instructions"
          },
          {
            "title": "Paper Robot: Video",
            "href": "https://youtu.be/qkUuGVyu3cg?feature=shared",
            "type": "video"
          },
          {
            "title": "Cardboard Phone Stand: Instructions",
            "href": "https://i.ytimg.com/vi/eFnLHOCWO3o/maxresdefault.jpg",
            "type": "instructions"
          },
          {
            "title": "Cardboard Phone Stand: Video",
            "href": "https://youtu.be/eFnLHOCWO3o?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "3D Cat-In-Box Automata",
            "href": "https://youtu.be/c7HKJqTHGbQ",
            "type": "resource"
          },
          {
            "title": "Red Panda Mask: Instructions",
            "href": "https://drive.google.com/file/d/18ycBCaeZMxluWkBjNt6LQaDYsNmdP6IZ/view",
            "type": "instructions"
          },
          {
            "title": "Red Panda Mask: Video",
            "href": "https://youtu.be/1EQl9iUae8E?feature=shared",
            "type": "video"
          },
          {
            "title": "Paper Basket: Instructions",
            "href": "https://www.instructables.com/Recycled-Paper-Basket/",
            "type": "instructions"
          },
          {
            "title": "Paper Basket: Video",
            "href": "https://youtu.be/wWDzSA3X63M?feature=shared",
            "type": "video"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Walking Paper Mech Warrior or Robot: Instructions",
            "href": "https://www.instructables.com/Walking-Papercraft-Mech-Warrior/",
            "type": "instructions"
          },
          {
            "title": "Walking Paper Mech Warrior or Robot: Video",
            "href": "https://youtu.be/azixGAjPC1Q?feature=shared",
            "type": "video"
          },
          {
            "title": "Rabbit eating Carrot Automaton : Instructions",
            "href": "https://drive.google.com/file/d/1IHAyK4fpdj5Z5omyYo-24t0BrAIumabE/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "Rabbit eating Carrot Automaton : Video",
            "href": "https://youtu.be/SxvO-kNyOOU?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      }
    ],
    "count": 40
    // Total project rows in this category.
  },
  {
    "id": "paper-flight",
    "name": "Paper Flight",
    "description": "Design, fold, and test flying paper builds.",
    "color": "#8b5cf6",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Basic Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-dart.shtml",
            "type": "instructions"
          },
          {
            "title": "Basic Paper Airplane: Video",
            "href": "https://youtu.be/veyZNyurlwU?feature=shared",
            "type": "video"
          },
          {
            "title": "Paper Helicopter: Instructions",
            "href": "https://www.origamiway.com/how-to-make-a-paper-helicopter.shtml",
            "type": "instructions"
          },
          {
            "title": "Paper Helicopter: Video",
            "href": "https://youtu.be/zTakrjE9yCo?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Nakamura Lock Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-nakamura-lock.shtml",
            "type": "instructions"
          },
          {
            "title": "Nakamura Lock Paper Airplane: Video",
            "href": "https://youtu.be/P4J4Cj2HcQU?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Spy Plane Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-spy-plane.shtml",
            "type": "instructions"
          },
          {
            "title": "Spy Plane Paper Airplane: Video",
            "href": "https://youtu.be/VfWAGxQZaDc?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Professional Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-professional.shtml",
            "type": "instructions"
          },
          {
            "title": "Professional Paper Airplane: Video",
            "href": "https://youtu.be/K2tVuqNxKdw?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Headhunter Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-headhunter.shtml",
            "type": "instructions"
          },
          {
            "title": "Headhunter Paper Airplane: Video",
            "href": "https://youtu.be/LidNaWlnO5k?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pet Dragon Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-pet-dragon.shtml",
            "type": "instructions"
          },
          {
            "title": "Pet Dragon Paper Airplane: Video",
            "href": "https://youtu.be/oqeNcIHlePc?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Infinity Arrow Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-infinity-arrow.shtml",
            "type": "instructions"
          },
          {
            "title": "Infinity Arrow Paper Airplane: Video",
            "href": "https://youtu.be/KIGEBjiBDFM?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Star Crusher Paper Airplane: Instructions",
            "href": "https://www.origamiway.com/plane-star-crusher.shtml",
            "type": "instructions"
          },
          {
            "title": "Star Crusher Paper Airplane: Video",
            "href": "https://youtu.be/5iqFlEpQs0U?feature=shared",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "popsicle-sticks",
    "name": "Popsicle Sticks",
    "description": "Create structures, mechanisms, toys, and models.",
    "color": "#4f46e5",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Heroes: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Superheros/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Heroes: Video",
            "href": "https://www.youtube.com/watch?v=KnpnVe5uxhw",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Playing Cards: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Playing-Cards/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Playing Cards: Video",
            "href": "https://youtu.be/4vYWuCej_Rg?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Coaster: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Coaster/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Coaster: Video",
            "href": "https://youtu.be/sTrp37Dv4hI?feature=shared",
            "type": "video"
          },
          {
            "title": "Exploding Popsicle Sticks: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Bomb-2/",
            "type": "instructions"
          },
          {
            "title": "Exploding Popsicle Sticks: Video",
            "href": "https://youtu.be/GQyGDKklVPU?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Icosahedron: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Icosahedron/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Icosahedron: Video",
            "href": "https://youtu.be/xL7esJK-b2U?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Newton's Cradle: Instructions",
            "href": "https://www.instructables.com/Newtons-Cradle-Out-of-Popsicle-Sticks/",
            "type": "instructions"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Newton's Cradle: Video",
            "href": "https://youtu.be/DJI3EaBZFZA?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Chain Reaction: Instructions",
            "href": "https://youtu.be/FGXv-Pp615U",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Chain Reaction: Video",
            "href": "https://youtu.be/r7j7l39ZAsU?feature=shared",
            "type": "video"
          },
          {
            "title": "Da Vinci Popsicle Stick Bridge: Instructions",
            "href": "https://www.instructables.com/Da-Vinci-Popsicle-Stick-Bridge/",
            "type": "instructions"
          },
          {
            "title": "Da Vinci Popsicle Stick Bridge: Video",
            "href": "https://youtu.be/mVP0I-nsP_8?feature=shared",
            "type": "video"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Spoon Catapult Out Of Popsicle Sticks: Video",
            "href": "https://www.youtube.com/watch?v=iKQaTFfhwWo",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Holder: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Holder/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Holder: Video",
            "href": "https://youtu.be/gU3AqE5zzTg?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Hexagon Shelf: Instructions",
            "href": "https://www.instructables.com/Popsicle-Sticks-Hexagon-Shelf/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Hexagon Shelf: Video",
            "href": "https://youtu.be/D61inpGzPUc?feature=shared",
            "type": "video"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Motorboat: Instructions",
            "href": "https://www.instructables.com/Popsicle-stick-motorboat/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Motorboat: Video",
            "href": "https://youtu.be/dhV3h-Hjpmk?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Birdhouse: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Birdhouse/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Birdhouse: Video",
            "href": "https://youtu.be/L_s0M5Z8Nm8?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Shutter Lamp Shade: Instructions",
            "href": "https://www.instructables.com/Make-a-Popsicle-Stick-Shutter-Lamp/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Shutter Lamp Shade: Video",
            "href": "https://youtu.be/rLPnaF2Dy7k?feature=shared",
            "type": "video"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Shutter Lamp Shade: Instructions",
            "href": "https://www.instructables.com/Make-a-Popsicle-Stick-Shutter-Lamp/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Shutter Lamp Shade: Video",
            "href": "https://youtu.be/rLPnaF2Dy7k?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Ring: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Ring/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Ring: Video",
            "href": "https://youtu.be/M-oDO7HaenU?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Folding Chair: Video",
            "href": "https://youtu.be/jAi6S_5krTo?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Bridge: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Bridge/",
            "type": "instructions"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Bridge: Video",
            "href": "https://youtu.be/eGM36jU_364?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Helicopter: Video",
            "href": "https://youtu.be/LEfU-ke-oVk?feature=shared",
            "type": "video"
          },
          {
            "title": "Popsicle Stick Marble Labyrinth: Instructions",
            "href": "https://www.instructables.com/Popsicle-Stick-Marble-Labyrinth/",
            "type": "instructions"
          },
          {
            "title": "Popsicle Stick Marble Labyrinth: Video",
            "href": "https://youtu.be/1yIxqWfaczg?feature=shared",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      }
    ],
    "count": 37
    // Total project rows in this category.
  },
  {
    "id": "fiber-art",
    "name": "Fiber Art",
    "description": "Explore yarn, crochet, weaving, and textile projects.",
    "color": "#2563eb",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pumpkin Pom-Pom: Instructions",
            "href": "https://www.instructables.com/Easy-Pumpkin-Pom-Pom-With-Your-Hand/",
            "type": "instructions"
          },
          {
            "title": "Pumpkin Pom-Pom: Video",
            "href": "https://www.youtube.com/watch?v=oi2NBGKAkH4",
            "type": "video"
          },
          {
            "title": "Cardboard Yarn Letter: Instructions",
            "href": "https://www.instructables.com/Cardboard-Yarn-Letter/",
            "type": "instructions"
          },
          {
            "title": "Cardboard Yarn Letter: Video",
            "href": "https://www.youtube.com/watch?v=RIrDDS_DE7E",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Crochet Chain Bracelet: Instructions",
            "href": "https://www.crochetleaf.com/chain-stitch-bracelet.html",
            "type": "instructions"
          },
          {
            "title": "Crochet Chain Bracelet: Video",
            "href": "https://www.youtube.com/watch?v=R49LOKSHw6c",
            "type": "video"
          },
          {
            "title": "Yarn Art: Instructions",
            "href": "https://www.instructables.com/Yarn-Art/",
            "type": "instructions"
          },
          {
            "title": "Yarn Art: Video",
            "href": "https://www.youtube.com/watch?v=_WQGT7DBeEM",
            "type": "video"
          },
          {
            "title": "Yarn Dolls: Instructions",
            "href": "https://www.instructables.com/Yarn-Dolls-1/",
            "type": "instructions"
          },
          {
            "title": "Yarn Dolls: Video",
            "href": "https://www.youtube.com/watch?v=bDGdD21y3nI",
            "type": "video"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "String Art with Paperclips",
            "href": "https://www.instructables.com/String-Art-With-Paperclips/",
            "type": "resource"
          },
          {
            "title": "Friendship Bracelet Cable Wrap",
            "href": "https://www.instructables.com/Chevron-Friendship-Bracelet-Style-Cable-Wrap-2-Siz/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Geometric String Art",
            "href": "https://www.instructables.com/Geometric-String-Art/",
            "type": "resource"
          },
          {
            "title": "Posable Yarn Friend",
            "href": "https://www.instructables.com/Posable-Creepy-Yarn-Friend/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Textured Crochet Square Potholder",
            "href": "https://www.instructables.com/Textured-Crochet-Square-Potholder/",
            "type": "resource"
          },
          {
            "title": "How to Finger Weave: Instructions",
            "href": "https://www.instructables.com/How-to-Fingerweave-Something/",
            "type": "instructions"
          },
          {
            "title": "How to Finger Weave: Video",
            "href": "https://www.youtube.com/watch?v=pAhuzHltIDs",
            "type": "video"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Yarn Jewelry",
            "href": "https://www.instructables.com/Pantry-Yarn-Jewelry/",
            "type": "resource"
          },
          {
            "title": "Trollen Wheel Weaving: Instructions",
            "href": "https://www.instructables.com/Viking-Braids-Make-a-Trollen-Wheel/",
            "type": "instructions"
          },
          {
            "title": "Trollen Wheel Weaving: Video",
            "href": "https://www.youtube.com/watch?v=q9giXHTOpYE",
            "type": "video"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Complete an Embroidery Project",
            "href": "https://www.instructables.com/Zodiac-Embroidery/",
            "type": "resource"
          },
          {
            "title": "(Skip the LED portion)",
            "href": "#",
            "type": "resource"
          },
          {
            "title": "Try three different String Art Patterns - and make a gift card USING:",
            "href": "#",
            "type": "resource"
          },
          {
            "title": "Different Shape String Art Templates: Instructions",
            "href": "https://www.instructables.com/String-Art-Valentine-Cards-and-Other-Holidays/",
            "type": "instructions"
          },
          {
            "title": "Different Shape String Art Templates: Video",
            "href": "https://www.youtube.com/watch?v=IANCecGCzi8",
            "type": "video"
          },
          {
            "title": "Thread Triangular Art Card",
            "href": "https://www.instructables.com/silk-thread-triangular-art-card/",
            "type": "resource"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Complete an Independent Embroidery Project -- find your own template online, and follow previous instructions",
            "href": "#",
            "type": "instructions"
          },
          {
            "title": "3d String art - USE POPSICLE STICKS and small hole puncher",
            "href": "https://www.instructables.com/Desktop-3D-String-Art/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      }
    ],
    "count": 28
    // Total project rows in this category.
  },
  {
    "id": "hands-on-science",
    "name": "Hands-On Science",
    "description": "Try experiments, challenges, and physical science builds.",
    "color": "#0ea5e9",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Egg Carton Nursery",
            "href": "https://www.pbs.org/parents/crafts-and-experiments/grow-seedlings-in-an-egg-carton",
            "type": "resource"
          },
          {
            "title": "Counting Over 1000 Using Your Fingers",
            "href": "https://www.youtube.com/watch?v=UixU1oRW64Q",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Weather Station",
            "href": "https://drive.google.com/file/d/1O0bT2-sGLiS1GLWVZcK0TnYrlvv6KgzX/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "Mind Reader",
            "href": "https://drive.google.com/file/d/1BAkhRoxQF9QVhZEfiQyR8pI1HumePlen/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Mind Reader Video! (Super helpful!)",
            "href": "https://youtu.be/cT8sQiUJipg?si=KCTKLWDMNlDT8OVB",
            "type": "video"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Candy Chromatography",
            "href": "https://drive.google.com/file/d/126E2Z_B8nCq8JpA4ia0i9Z7Ljf9C5c5M/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "Solar Oven",
            "href": "https://drive.google.com/file/d/1CdqLCvGN40ysJ8MRlHPS-KYpw98wJTBY/view?usp=drive_link",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Air Blaster",
            "href": "https://drive.google.com/file/d/1bw_uqz1i51PHv6AERrFe1PzzW8kXq6Dr/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "Slime: Instructions",
            "href": "https://littlebinsforlittlehands.com/how-to-make-saline-solution-slime-recipe/",
            "type": "instructions"
          },
          {
            "title": "Slime: Video",
            "href": "https://youtu.be/Tb84tJl7eqo?feature=shared",
            "type": "video"
          },
          {
            "title": "Parachute Design (Video Only)",
            "href": "https://youtu.be/nmJPOHNUzB4?si=bambm151qwEiCt9A",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Straw Bridge Instructions",
            "href": "https://drive.google.com/file/d/1akOucflalXWMubu9WXHu8yqtMij3VNQp/view?usp=sharing",
            "type": "instructions"
          },
          {
            "title": "OR Straw Bridge Video",
            "href": "https://youtu.be/GA93aHRDMD8?si=T6ARglUbQ_lxYkrW",
            "type": "video"
          },
          {
            "title": "Comeback Can",
            "href": "https://drive.google.com/file/d/1p_LeN5IUHgKT60g22BXQs2ULIO3PIiS-/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Comeback Can Video",
            "href": "https://youtu.be/-DPxl7Ik93k?si=YZEzzAqT2VaU9Ybd",
            "type": "video"
          },
          {
            "title": "Hovercraft Instructions",
            "href": "https://www.scienceworld.ca/resource/balloon-hovercraft/",
            "type": "instructions"
          },
          {
            "title": "OR Hovercraft Video",
            "href": "https://youtu.be/iujDMqL_448?si=jOtEGtRhQTBBIndM",
            "type": "video"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Paddle Boat",
            "href": "https://drive.google.com/file/d/1kUiCEnFz4VwxUuQrxV0K4cSak_jYUZmF/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Paddle Boat Video",
            "href": "https://youtu.be/PlANTECC-QA?si=IjY30kQVq7ImkQF4",
            "type": "video"
          },
          {
            "title": "Newspaper Fort",
            "href": "https://drive.google.com/file/d/1B03vIpJrk3OWNSD1uPnig3MQiapCKm17/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Newspaper Fort Video",
            "href": "https://youtu.be/TV2Fpq8s9Ws?si=BnylX105FK3kOvVv",
            "type": "video"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Hot Air Balloon",
            "href": "https://drive.google.com/file/d/1FnFf9_HAUDPQ54H20Ek2kcH-Cag_g3ck/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Hot Air Balloon Video",
            "href": "https://youtu.be/2t170Kb9Fz8?si=LAdqHX2kMDYUcCY6",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Stomp Rocket",
            "href": "https://drive.google.com/file/d/1WkN1uyYV0oMvkOrO9HOMc5VE12K6A4hU/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "OR Stomp Rocket Video",
            "href": "https://youtu.be/9oZSBSYB1_o?si=Sis4McMY5Nzs_scN",
            "type": "video"
          },
          {
            "title": "Hot Glue 3D Water Printing",
            "href": "https://docs.google.com/presentation/d/1-7Fn-l2FIu0Lt7eOuAriNNzYmrxwMMgcfrxu_Cpru7A/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      }
    ],
    "count": 26
    // Total project rows in this category.
  },
  {
    "id": "3d-printing-101-prusa-mini",
    "name": "3D Printing 101 (Prusa Mini)",
    "description": "Design, slice, and print beginner 3D models.",
    "color": "#14b8a6",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. Design a Mesh Model in Sculptris",
            "href": "https://drive.google.com/open?id=1-px_dgqD27YoiMfLxrYysuD_sWbwHZ1FkKEOCjB0bJw",
            "type": "resource"
          },
          {
            "title": "1. Design a Mesh Model on the Web",
            "href": "https://docs.google.com/document/d/14Lbh7DkWVNFkcI0WmlF898Ifk5mKU0IWm6ZgqRxkWF4/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "2. Slice a Model with Prusa Slicer",
            "href": "https://docs.google.com/document/d/1upXN7Sn65urau1wNAFDMXtyxqXqN8KoHL3yEZmVe_bE/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "3. Operating a PrusaMini",
            "href": "https://docs.google.com/document/d/1NUxdjrleygNWIulcpqfp5QnaQXQO5-6ylX8NuEyR6Wk/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. TinkerCAD Setup",
            "href": "https://docs.google.com/document/d/1nZVrv83v7UY9wUDPerOByM0jOgnmNomrNawanWTDaIM/edit?usp=sharing",
            "type": "setup"
          },
          {
            "title": "2. Intro to TinkerCAD",
            "href": "https://docs.google.com/document/d/1Abz3T5SNf5l3LclQbwUUS0Vc3Dx8z3_yeSVAjtm5QHM/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Lithophane in FlashPrint",
            "href": "https://drive.google.com/open?id=13ZW3JMHMBOVJriVCoxsfjZ0r6-7dP7ujKPQG5CWSI-g",
            "type": "resource"
          },
          {
            "title": "Extruded Traced Bitmap",
            "href": "https://drive.google.com/open?id=1denVgeSQwDsPCYnQwmxJzHssLNW7ZehRVtUEQJTUacs",
            "type": "resource"
          },
          {
            "title": "TinkerCAD Game Piece",
            "href": "https://drive.google.com/open?id=1ge0KJgVUiaSCQYDNslE1qczOuyljhAzrinsVNRIjujU",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Custom Phone Stand",
            "href": "https://docs.google.com/document/d/1OA3BuftxTsMSqYeQtNtpnxNZfOsnoQrMqopognIWf8A/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Custom Ring in TinkerCad",
            "href": "https://docs.google.com/document/d/18khDTj27AIhp4tYXK_6c7QlxLbZoTUa9SemmDa7N9a8/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Custom BRICK",
            "href": "https://drive.google.com/open?id=10kkz3Lm5hm-grF-s-gbYWJ6ll6kzLK1Ocu-vE1_MU1k",
            "type": "resource"
          },
          {
            "title": "Custom Cookie Cutter",
            "href": "https://docs.google.com/document/d/1-bPp7kwhK2IwONXSVg0EuA-Bo0SGaFJ0eQahFJPu_iQ/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Head Scan",
            "href": "https://drive.google.com/open?id=1_4dD4H4J8Eq4S0eCQBxYwxvhclI2bIXJS9febTysEe8",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Altered Head Scan",
            "href": "https://drive.google.com/open?id=1iE-VRqtvK6xV4u7fhxch5KTYHn3k-Npcq9Pc5g1zKZM",
            "type": "resource"
          },
          {
            "title": "Assemble a Screwless Gear Cube",
            "href": "https://docs.google.com/document/d/12ymvx_31TNeZy9h9VrEQz7n7j1GnxK6o1-z7bdzuhms/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Custom Secret Message Container",
            "href": "https://docs.google.com/document/d/1_uasA_Za-9T3Y_kVKt417sgiWPoqRAt1uy8vS634EAE/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 17
    // Total project rows in this category.
  },
  {
    "id": "vinyl-cutting-cameo",
    "name": "Vinyl Cutting (Cameo)",
    "description": "Create decals and cut designs with vinyl tools.",
    "color": "#22c55e",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Introduction to Silhouette Studio",
            "href": "https://docs.google.com/document/d/1xWcqfcxSU7U8cQhd8wbiB2uzbfazvSmO/edit",
            "type": "resource"
          },
          {
            "title": "How to Operate a Cameo 3 Vinyl Cutter",
            "href": "https://docs.google.com/document/d/1-RKGi-l_QMrycU-2nXIYaGFFazrayhTo/edit",
            "type": "resource"
          },
          {
            "title": "How to Operate a Cameo 4 Vinyl Cutter",
            "href": "https://docs.google.com/document/d/1ihm51BJbhbJg2W8rZuadxG_umpEW2MvX/edit",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make a Name Decal",
            "href": "https://docs.google.com/document/d/14xUjEdv4Ih1zdgg8OBxuz8Hnm6tmL_vb/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "How To Apply a Vinly Decal",
            "href": "https://docs.google.com/document/d/1D5qDopoflQ4PM_qTRfv1qhc95A-UN3uL/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Trace an Image in Silhouette Studio",
            "href": "https://docs.google.com/document/d/1RkdDKCjzJTwM2dAsCoNgLksI2viHa0Wv/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make a Heat Transfer Design",
            "href": "https://docs.google.com/document/d/1ToUxPWMPBVwPsauaU0m3mG77AzXnkT1K/edit",
            "type": "resource"
          },
          {
            "title": "How to Operate the Heat Press",
            "href": "https://docs.google.com/document/d/1gZX95vsLJHtNTK8G22r12zt5wgir5w67/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make a 2-Color Decal",
            "href": "https://docs.google.com/document/d/1UwbTx0Rt6fbwfz9Cgue8KVpuds2Tfzok/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "3+ Color Decal",
            "href": "https://docs.google.com/document/d/1Tc6vsuXBtJXbRC0qWsRk_SMfgxlO4TZA/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Draw & Cut with the Vinyl Cutter",
            "href": "https://docs.google.com/document/d/1_Luof-f1lRxi2Ww00u1SrfLTtiCy3-Kv/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 11
    // Total project rows in this category.
  },
  {
    "id": "laser-cutting-101-muse",
    "name": "Laser Cutting 101 (Muse)",
    "description": "Learn laser safety, files, and cut projects.",
    "color": "#84cc16",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Muse Laser Cutter Manual**",
            "href": "https://2882208.fs1.hubspotusercontent-na1.net/hubfs/2882208/Muse%20Core%20Manual%201-23.pdf",
            "type": "instructions"
          },
          {
            "title": "Operate the Muse Laser Cutter",
            "href": "https://docs.google.com/document/d/1CFgD1smsIa1M34kqKHDH5plTjC3YVqDN/edit",
            "type": "resource"
          },
          {
            "title": "Fab Lab Fridge Magnet Test",
            "href": "https://docs.google.com/document/d/1hbh0TUZPwn0uB8zmLZwz4rizc4T6Y1c9/edit",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Name Tag",
            "href": "https://docs.google.com/document/d/1dxPYF_T5Pq23CgZOXMrVNRpgbaIYGmwt/edit",
            "type": "resource"
          },
          {
            "title": "Keychain",
            "href": "https://docs.google.com/document/d/1W617q1dH_ef_9ndTik_k4LD4Yff653xU/edit",
            "type": "resource"
          },
          {
            "title": "Coaster",
            "href": "https://docs.google.com/document/d/1hdf0m-t-J9EF1vZiVz8-334qMj6Cln7o/edit",
            "type": "resource"
          },
          {
            "title": "Tic-Tac-Toe Set",
            "href": "https://docs.google.com/document/d/1drz-Kdm0iqL8p7vVZE50z6SV-4EK_34A/edit",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Trace an Image in Inkscape",
            "href": "https://docs.google.com/document/d/1afeIQDA7kRPlD-9IfBcTANHKL46yaDRD/edit",
            "type": "resource"
          },
          {
            "title": "Fake Stained Glass",
            "href": "https://docs.google.com/document/d/1ljoF3uKHa_1_Y_2vFOQcaqLoh-8SUohu/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "2.5D Chess Pawn",
            "href": "https://docs.google.com/document/d/1uaXBzE9SLDNS5D8MlvX8VyoH_RXwIeQx/edit",
            "type": "resource"
          },
          {
            "title": "Laser Cut Diorama",
            "href": "https://docs.google.com/document/d/1D2PAy1wVQnP-YMVjyJR-xYKg5pLk8fMI/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Maker Case Box",
            "href": "https://docs.google.com/document/d/1O50opFhpsbVBoNCJ7VcfRnx4B2VxCJvB/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Laser Cut Spirograph",
            "href": "https://docs.google.com/document/d/1Kx1n7EJ7s3bKNhFk0jXMh2GU8BqYi3GJ/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Laser Cut Pantograph",
            "href": "https://docs.google.com/document/d/1CVJ4ADuGut4tn-0go_BBH5LIO91tQ-bI/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Laser Cut Gear Box",
            "href": "https://docs.google.com/document/d/1r0OgOqTrdItJCz_fC6pdsqJGu5BRHDCC/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 15
    // Total project rows in this category.
  },
  {
    "id": "digital-embroidery-101-brother-pe800",
    "name": "Digital Embroidery 101 (Brother PE800)",
    "description": "Hoop, thread, stitch, and finish embroidery projects.",
    "color": "#eab308",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Hooping Fabric for Embroidery Machine",
            "href": "https://docs.google.com/document/d/19TWrhT59vthZ-x71_YN8poeZSdChET5S/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Threading the PE800 (Video)",
            "href": "https://youtu.be/3voxF1cbyS4?t=103",
            "type": "video"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Embroider Your Name",
            "href": "https://docs.google.com/document/d/1qqNh_5BpfkRn3KvBBr757DzXfSKWn-UA/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Multicolor Patch",
            "href": "https://docs.google.com/document/d/1DVfj7wUGo8kYKOKMwN-xWRHMnbcu9ntZ/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Multipart Patch",
            "href": "https://docs.google.com/document/d/1RuZHY8ptb9WwbXFFGKUn3NmpZ9ctryqI/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Add an Applique",
            "href": "https://docs.google.com/document/d/1IOvIZfmdBF1oxf-nHhZwZMhucqp9r5xU/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Puffy Embroidery",
            "href": "https://docs.google.com/document/d/1-CEx8VKVYznZnVA5EttqWfSQJqTHD5_N/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Sewing an External File",
            "href": "https://docs.google.com/document/d/1fUh9h8QnOMm4nQWjyDDRYclUBADgCAA3/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 8
    // Total project rows in this category.
  },
  {
    "id": "electronics-101",
    "name": "Electronics 101",
    "description": "Build circuits, lights, and electronics experiments.",
    "color": "#f97316",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. TinkerCAD Setup",
            "href": "https://docs.google.com/document/d/1eOUcYsAs_NhbfDqq8WUAjei6RKpMsr62/edit",
            "type": "setup"
          },
          {
            "title": "2. Simple Lamp",
            "href": "https://docs.google.com/document/d/1t6vEsXuo7HqfO3QZWdquD8A6IVD0W4ne/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Cu Tape Torch",
            "href": "https://drive.google.com/file/d/0B66Qe-o5qktELTBNUkVMZ3VURlE/view?usp=sharing&resourcekey=0-oVcVrUPm1xeobeRPUknBww",
            "type": "resource"
          },
          {
            "title": "Paper Parallel Circuit",
            "href": "https://docs.google.com/document/d/1LhzaRdE7mulAwX0aXnoeS19P7CnkcKsy/edit",
            "type": "resource"
          },
          {
            "title": "Cu Tape Torch Instructable w/ video",
            "href": "https://www.instructables.com/Circuit-Torch/",
            "type": "video"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Simple LED Circuit",
            "href": "https://docs.google.com/document/d/1sxRiEsIo-oyoy2xQXOsAdUqUbkZXUBD4/edit",
            "type": "resource"
          },
          {
            "title": "Resistor Code Wheel",
            "href": "https://drive.google.com/open?id=1hvufvKUJdoDnYfYvqjZStlwFDl4UnQ-X",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make an LED Series Circuit",
            "href": "https://docs.google.com/document/d/1ZPS6lfO9SXX24JczBVcq7Cqc2-XPw_ET/edit",
            "type": "resource"
          },
          {
            "title": "Make a Variable Resistor",
            "href": "https://docs.google.com/document/d/1ywzIkCgD4mzWq1Pguh6pPOIqp3t2iukU/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "LED Stop Light Circuit",
            "href": "https://docs.google.com/document/d/1s7n_SGLBTTlPKZySVZilAk1ws8q7HlQk/edit",
            "type": "resource"
          },
          {
            "title": "RGB LED Circuit",
            "href": "https://docs.google.com/document/d/1S_Iga0mpq_59w8hgqPI5iW379MQ-Yy0w/edit",
            "type": "resource"
          },
          {
            "title": "RGB LED Cu Tape Circuit",
            "href": "https://docs.google.com/document/d/1G72STvxmJHXbFFFu8L5aLgF5cucDzMC0/edit",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "How a Capacitor Works",
            "href": "https://docs.google.com/document/d/1Ili_5KdyCszRVXzE9q-lnFbVPZ95H1xZ/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "555 Blinking Light",
            "href": "https://docs.google.com/document/d/1j0SF_83C7RftXOv9LFS2dyUrataAOEXf/edit",
            "type": "resource"
          },
          {
            "title": "555 Photo Theremin",
            "href": "https://docs.google.com/document/d/1Xp465RMT_ucVlGSQLFQeh7BdEgJGra1j/edit",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "555 Octave Keyboard",
            "href": "https://docs.google.com/document/d/1cIlo2cDxQ_rc0dzkP_IOSqML8NCB3rIW/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 16
    // Total project rows in this category.
  },
  {
    "id": "mechatronics",
    "name": "Mechatronics",
    "description": "Combine mechanisms, motion, gears, and controls.",
    "color": "#ef4444",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Gluetorial Sampler",
            "href": "https://docs.google.com/document/d/1Ut_yKCfCMPef_R_wOPdUl2SlnA50EHWe/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Slider Crank Diagram",
            "href": "https://docs.google.com/presentation/d/16HNDgOB5AO-L7WBvDG6eI5t304hz-fNXTQxHrFqQlZ8/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Slider Crank Assembly Pics",
            "href": "https://photos.app.goo.gl/hw9x96uq7vUj682H9",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Cam and Follower",
            "href": "https://docs.google.com/presentation/d/1M6siUEXQSTYWsuqMaWkWy-U8uVWBzDuhjr71Ipd_Tgs/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Corregated Gears",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Cage Gears",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Laser Cut Spirograph",
            "href": "https://docs.google.com/document/d/1ZwWYj9OczMhbOE9G3NO_n5U6EHvN4-MU/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Arduino Programming -Servo",
            "href": "https://learn.adafruit.com/adafruit-arduino-lesson-14-servo-motors?view=all",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create your own Autonomous Robot",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "engineering-101",
    "name": "Engineering 101",
    "description": "Design, build, test, and improve engineering solutions.",
    "color": "#ec4899",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "What is Engineering?",
            "href": "https://www.youtube.com/watch?v=btGYcizV0iI&list=PL8dPuuaLjXtO4A_tL6DLZRotxEb114cMR&t=0s",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Straw Rocket",
            "href": "https://www.jpl.nasa.gov/edu/learn/project/make-a-straw-rocket/",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Toothpick Tower",
            "href": "http://www.crscience.org/pdf/Marshmallow_toothpick_challenge.pdf",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Popsicle Stick Harmonica",
            "href": "http://www.housingaforest.com/popsicle-stick-harmonica/",
            "type": "resource"
          },
          {
            "title": "DIY Spin Drum",
            "href": "https://www.minted.com/julep/2014/07/14/kids-party-ideas-diy-musical-instrument/",
            "type": "resource"
          },
          {
            "title": "Rubber Band Guitar",
            "href": "http://www.makeit-loveit.com/2011/03/mister-make-it-and-love-it-series.html",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Spaghetti Bridge",
            "href": "https://www.wikihow.com/Build-a-Spaghetti-Bridge",
            "type": "resource"
          },
          {
            "title": "Build a Mini Siege Engine",
            "href": "https://www.instructables.com/id/Mini-Siege-Engines/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Rubber Band Car",
            "href": "https://yourmoderndad.com/diy-rubber-band-racer/",
            "type": "resource"
          },
          {
            "title": "Try the Egg Drop Challenge",
            "href": "https://buggyandbuddy.com/stem-kids-egg-drop-project/",
            "type": "resource"
          },
          {
            "title": "Water Balloon Catapult",
            "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG12_Catapult.pdf",
            "type": "resource"
          },
          {
            "title": "Tensegrity Flying Man",
            "href": "https://drive.google.com/file/d/1MMonoBmbj4pA3U2bIDErOIUexkple7JQ/view?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Propeller Toy",
            "href": "https://www.instructables.com/Hand-powered-vintage-propeller-toy/",
            "type": "resource"
          },
          {
            "title": "Build a Propeller Car",
            "href": "https://www.instructables.com/id/Propeller-Powered-Car/",
            "type": "resource"
          },
          {
            "title": "Build a Dragonfly Helicopter",
            "href": "https://sciencetoymaker.org/dragonfly-helicopter/copter-common-materials/",
            "type": "resource"
          },
          {
            "title": "Balloon Racer",
            "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG13_Racer.pdf",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a Rubber Band Plane",
            "href": "https://www.instructables.com/id/Rubber-Band-Powered-Aeroplane/",
            "type": "resource"
          },
          {
            "title": "Rube Goldberg Machine",
            "href": "https://drive.google.com/file/d/1k4xgxYNdcNUu5eqj4_BAfpkjvlnhQgoi/view?usp=drive_link",
            "type": "resource"
          },
          {
            "title": "Scribble Bot",
            "href": "https://www.msichicago.org/fileadmin/assets/online_science/summer_brain_games/activity_PDFs/SBG15_space_bot.pdf",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      }
    ],
    "count": 19
    // Total project rows in this category.
  },
  {
    "id": "turtle-stitch",
    "name": "Turtle Stitch",
    "description": "Use code-driven stitching and shape-based embroidery.",
    "color": "#a855f7",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create TurtleStitch Account",
            "href": "https://docs.google.com/document/d/1zqNidmzZgIfzBh2yuugQ50Agv4yEVt4N/edit",
            "type": "setup"
          },
          {
            "title": "Start",
            "href": "https://docs.google.com/drawings/d/1-uHPoLC0UX1xvWMZKjSxvbsvp-k7fOMVudr4jzaf5F0/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Comment",
            "href": "https://docs.google.com/drawings/d/1x1SmrL5EtZ5Yzwd9zbRAVJFq465e96Xh7k0Cx1G-Jw0/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Line",
            "href": "https://docs.google.com/drawings/d/1qQT8kosxr7BZy6vssIXgCgH3bNfsLgRUAOBcS6idk-U/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Embroidery (Stitch Types)",
            "href": "https://docs.google.com/drawings/d/1i3q6qMgaayyaLjo2IC1hQa49hoxbAqSzq4SMCsXNRMU/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "File Format",
            "href": "https://docs.google.com/drawings/d/1nLwpzhCSMjUBZnhaBLIrXrPoBfRqU3i23w159QC81as/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 6
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Dimensions",
            "href": "#",
            "type": "resource"
          },
          {
            "title": "Square",
            "href": "https://docs.google.com/drawings/d/1sXr-WP-nuB0_w2C3fjDDId3xprYm8h2tqNWrs5FG5Go/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Circle",
            "href": "https://docs.google.com/drawings/d/1GVQNEhL23_O-mgRGsQMmUZT0C6ET5dcKclpbZSKftR0/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Jump Stitch",
            "href": "https://docs.google.com/drawings/d/1Ai9GZJPne_Y2klYSPBWYpv8NQBClTw0PjSCNaWUiZAg/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Block",
            "href": "https://docs.google.com/drawings/d/1rKU7QiAU4R58gZ_htZsBuL3MOOsGYcj3SEXsOQpvA7Y/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Flower",
            "href": "https://docs.google.com/drawings/d/1GQNN4V6d8tXpIkobUtDnCC_EQPqNHhKQfsohl64Cjk8/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Pinwheel",
            "href": "https://docs.google.com/drawings/d/1ov00gFlmOrkyJAowCP2Q7aNajTkDJksH7Mcm96PCpdw/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Little & Large",
            "href": "https://docs.google.com/drawings/d/13Ct2MMdffsHZDHRLVIMILhW_eW-7mN7RFQmkil2BC1w/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Star",
            "href": "https://docs.google.com/drawings/d/1lU7kCTsR4nKMEUtM5YgEXLe78qjFGlymwdOJ9A8A2VY/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Reset",
            "href": "https://docs.google.com/drawings/d/1_SArTrXTLdDXrL6JQiy1pKtx-Q-BsiP_oLB00zCDSKA/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Triangle Spiral",
            "href": "https://docs.google.com/drawings/d/1VAEY7Ewmn_zX7cjmAFo5-W2JtLKJJbx2fAr4IZc2bhw/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Spiral Challenge",
            "href": "https://docs.google.com/drawings/d/1NBk9wr1xm88aX6Qs7Gi_P9LprBvTz5cxrwr9293Jp_s/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Density",
            "href": "https://docs.google.com/drawings/d/12aUaC9w3VJKcBLAsvKhr5_t270RUwgLw8LIMaBu-dwo/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Fractal Tree",
            "href": "https://docs.google.com/drawings/d/1NXVwLRsZARla142sQRdeH58kNO7j1rqDm7aQCV1KJd4/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 20
    // Total project rows in this category.
  },
  {
    "id": "block-coding-101-scratch",
    "name": "Block Coding 101 (scratch)",
    "description": "Create animations, stories, games, and interactive code.",
    "color": "#6366f1",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Getting Started",
            "href": "https://docs.google.com/document/d/13h4EK2Rpu6Km96zMcQBqSIBJJVBXsei6/edit",
            "type": "setup"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Creating Animations",
            "href": "https://docs.google.com/document/d/14S33M8FEPCjVKApkH58kDCXhohkgXOFA/edit",
            "type": "resource"
          },
          {
            "title": "Creating Art",
            "href": "https://docs.google.com/document/d/1JvQ0ECFePFdoNw_wCM5utE-WBQTGwqRW/edit",
            "type": "resource"
          },
          {
            "title": "Creating Music",
            "href": "https://docs.google.com/document/d/1qVlWeijstxURBSt492prJrz8iliEZYG0/edit",
            "type": "resource"
          },
          {
            "title": "Creating Games",
            "href": "https://docs.google.com/document/d/1Sz4EbNaD_G7nJi2h7BgZcgXmG7Fm--mz/edit",
            "type": "resource"
          },
          {
            "title": "Creating Stories",
            "href": "https://docs.google.com/document/d/1HPrmWclfelbzwD_eTH4RxPOW-1E1Vb0A/edit",
            "type": "resource"
          }
        ],
        "count": 5
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Talking Tales",
            "href": "https://docs.google.com/document/d/1k4m15sPw9s45uFCIbkKiVnW92gLTpkmf/edit",
            "type": "resource"
          },
          {
            "title": "Animate A Character",
            "href": "https://docs.google.com/document/d/1jbpp2bzgKT-pF-pDcUza_E493VldeyMS/edit",
            "type": "resource"
          },
          {
            "title": "Create Animations That Talk",
            "href": "https://docs.google.com/document/d/16YsotkA_OI0Fw1km8DR8oS16g8BoUIOO/edit",
            "type": "resource"
          },
          {
            "title": "Create A Story",
            "href": "https://docs.google.com/document/d/17M8EByW5HooIosIQfvx-zz0Xtl1p4uX2/edit",
            "type": "resource"
          }
        ],
        "count": 4
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Code a Cartoon",
            "href": "https://docs.google.com/document/d/1wgKr2BJtbjDlYzX5n21WlDZjJe-SND73/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Change Size",
            "href": "https://docs.google.com/document/d/1Hpnmek0HLztmtaESASCG0mqiQIuIBKee/edit",
            "type": "resource"
          },
          {
            "title": "Video Sensing",
            "href": "https://docs.google.com/document/d/1gWug_Nf1mZMw5ATMlWzU0wjBHsinoUox/edit",
            "type": "video"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pong Game",
            "href": "https://docs.google.com/document/d/18fnU7uyihVNTblfUJEDiH0wSgJ1Nd5ra/edit",
            "type": "resource"
          },
          {
            "title": "Animate an Adventure Game",
            "href": "https://docs.google.com/document/d/1bCDnYcWVfkNaeFdcyIc_qVqCT6AaokUu/edit",
            "type": "resource"
          },
          {
            "title": "Imagine a World",
            "href": "https://docs.google.com/document/d/1iEdsogsZrLmAEmLmr8C7DB2EPuGg8UoA/edit",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Check out some of the code made by other makers!",
            "href": "https://docs.google.com/document/d/1yit0Z6teBUKhRMHCQd7CnutXRShxh0cz/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create your very own and share it!",
            "href": "https://docs.google.com/document/d/1JUsbLTMXUavC93ovxRrKqxaG_FePn7F5/edit",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 18
    // Total project rows in this category.
  },
  {
    "id": "pygamer",
    "name": "Pygamer",
    "description": "Build and test handheld MakeCode Arcade projects.",
    "color": "#06b6d4",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Get a Pygamer, USB cord, and LiOn Battery",
            "href": "#",
            "type": "resource"
          },
          {
            "title": "(optional) Sign into MakeCode Using your Clever, Microsoft, or Google Account",
            "href": "https://arcade.makecode.com/",
            "type": "setup"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create a chasing Pizza Game",
            "href": "https://arcade.makecode.com/tutorials/chase-the-pizza",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Load the above code into the PyGamer",
            "href": "https://learn.adafruit.com/adafruit-pygamer/load-makecode-game-on-pybadge",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Complete One whole level of the ARCADE SKILLS MAP (Pidegeon Level)",
            "href": "https://arcade.makecode.com/--skillmap",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "complete two whole levels of Beginner Skills Map (Theater Curtain Level)",
            "href": "https://arcade.makecode.com/--skillmap",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Complete all the levels of the Beginner Skills Map (Kaiju Dinosaur Level)",
            "href": "https://arcade.makecode.com/--skillmap",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create a Game that incorporates the Lights at the Bottom of the Pygamer.",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Set the PyGamer to control an external light or Buzzer.",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "circuit-playground",
    "name": "Circuit Playground",
    "description": "Program sensors, lights, sounds, and devices.",
    "color": "#10b981",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Name 3 things a Circuit Playground can do",
            "href": "https://youtu.be/xel0AHvQgvk?si=uZ-nT3ra1mexTdIQ",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Connect your Circuit Playground to a laptop",
            "href": "https://youtu.be/auOcAoL4_Ik?si=n6Vh_TGL6ftcgFcohttps://youtu.be/auOcAoL4_Ik?si=n6Vh_TGL6ftcgFco",
            "type": "resource"
          },
          {
            "title": "https://makecode.adafruit.com/",
            "href": "https://makecode.adafruit.com/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Turn your Circuit Playground into a Siren the Siren tutorial in Make Code.",
            "href": "https://makecode.adafruit.com/",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Write a program to make the lights change color when the Circuit playground is tilted.",
            "href": "https://youtu.be/f9FI3s9DDMo",
            "type": "resource"
          },
          {
            "title": "Use the pins on Circuit Playground to make the LEDs Flash.",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [],
        "count": 0
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make your circuit playground control a servo.",
            "href": "https://youtu.be/cofElsolYk4?si=-wvwdtvg4Qq5itJf",
            "type": "resource"
          },
          {
            "title": "Write a program that causes one Circuit Playground start a program on another Circuit Playground",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Write an original program and share it with a friend",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [],
        "count": 0
        // Number of project rows in this belt.
      }
    ],
    "count": 9
    // Total project rows in this category.
  },
  {
    "id": "lego",
    "name": "Lego",
    "description": "Prototype towers, vehicles, structures, and robots.",
    "color": "#65a30d",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build the tallest tower of stacked bricks you can",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Build a house using interlocking bricks",
            "href": "https://www.wikihow.com/Build-a-LEGO-House",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Design a building for a Base on Mars",
            "href": "#",
            "type": "resource"
          },
          {
            "title": "Design a vehicle/rover for Mars",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Design a vehicle that can win a down hill race",
            "href": "https://youtube.com/shorts/u3SwgxKLUwE?si=T1NWpevHyK8IOrT7",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Make a 2 dimensional picture using Lego Blocks",
            "href": "https://youtu.be/3dY-kvNcDt8?si=BtbMzZqth4iseDhK",
            "type": "resource"
          },
          {
            "title": "1) Connect a Lego Spike Brick to your Laptop",
            "href": "https://spike.legoeducation.com/prime/start/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "2) Learn to program a Lego Spike Block to roll in a square.",
            "href": "https://spike.legoeducation.com/prime/start/",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Design a robot that does a particular job.",
            "href": "#",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Create a Lego Rover/ Robot using Lego Spike",
            "href": "https://youtu.be/8MXGh5VE9Bs?si=cRypSLi1tK6CrvkL",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      }
    ],
    "count": 10
    // Total project rows in this category.
  },
  {
    "id": "pipe-cleaners",
    "name": "Pipe Cleaners",
    "description": "Make flexible figures, flowers, and sculptures.",
    "color": "#d97706",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pipe Cleaner People",
            "href": "https://www.youtube.com/watch?v=zVkDp9sIjsU",
            "type": "resource"
          },
          {
            "title": "Pipe Cleaner Rings",
            "href": "https://www.youtube.com/watch?v=xX58LNA6wu4",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Fish",
            "href": "https://www.youtube.com/watch?v=bwO7NZpR8pw",
            "type": "resource"
          },
          {
            "title": "Pipe Cleaner Flower",
            "href": "https://www.instructables.com/Pipe-Cleaner-Flower-Mothers-Day-Craft/",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pipe Cleaner Jellyfish",
            "href": "https://www.youtube.com/watch?v=vlJFI1GfQOc&t=79s",
            "type": "resource"
          },
          {
            "title": "Dragonfly",
            "href": "https://www.youtube.com/shorts/tVX0EyBYvVA",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "CupCake",
            "href": "https://www.youtube.com/watch?v=QRHa3E53l3A",
            "type": "resource"
          },
          {
            "title": "Sword",
            "href": "https://www.youtube.com/watch?v=IZry2TYbC3s",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pipe Cleaner Crown",
            "href": "https://www.youtube.com/watch?v=IaJAUm2Joks",
            "type": "resource"
          },
          {
            "title": "Bubble Wand",
            "href": "https://www.youtube.com/watch?v=Vr_jrkd48Wc",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Spider",
            "href": "https://www.youtube.com/watch?v=ZvVvupxVEuw",
            "type": "resource"
          },
          {
            "title": "Ice Cream Cone Keychain",
            "href": "https://www.youtube.com/watch?v=q6DJt7ASzWQ",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Pipe Cleaner Dragon",
            "href": "https://frugalfun4boys.com/pipe-cleaner-dragons/",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "5NOF Cupcake",
            "href": "https://www.youtube.com/watch?v=-BhZbZNmmWA",
            "type": "resource"
          },
          {
            "title": "Giant Sunflower",
            "href": "https://www.youtube.com/watch?v=f6d1ds6GMR8",
            "type": "resource"
          },
          {
            "title": "Giant Flower",
            "href": "https://www.youtube.com/watch?v=0fqAcTThF3c&t=70s",
            "type": "resource"
          }
        ],
        "count": 3
        // Number of project rows in this belt.
      }
    ],
    "count": 16
    // Total project rows in this category.
  },
  {
    "id": "3d-pen",
    "name": "3D Pen",
    "description": "Draw, repair, and sculpt with a handheld 3D pen.",
    "color": "#047857",
    "belts": [
      // Belt sections shown inside this category card.
      {
        "name": "White",
        "id": "white",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "1. Introduction",
            "href": "https://docs.google.com/document/d/1erM-dn8OncLACIcfSAgK9LGNiq96H-6OdDo398lAU5Y/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "2. Your Name",
            "href": "https://docs.google.com/document/d/19JXLtQG7nXubzQjywlamAlZ3v3UBPWrHYinv6TQ9KKs/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Yellow",
        "id": "yellow",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Basic Shape Outlines",
            "href": "https://docs.google.com/document/d/1HAyzb1gmbR-r82TWfSrvEerTvJH4CRrVAVd9QEviOxY/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "FIx a 3D Print",
            "href": "https://docs.google.com/document/d/1yS_LKKFY341gP8LiCus3zHDoCF7BvIg3tzqDRYIU0iM/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Orange",
        "id": "orange",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "2D Drawing",
            "href": "https://docs.google.com/document/d/1eiqnsKYFODBw_7ibTZXMK6Noh-TRsrimBCCEGgnahTg/edit?usp=sharing",
            "type": "resource"
          },
          {
            "title": "Tetrahedron",
            "href": "https://docs.google.com/document/d/1CPvkqD8q4THyaOTdbSDBAyyThqqebgVn2ZAEjjyg6Z4/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 2
        // Number of project rows in this belt.
      },
      {
        "name": "Green",
        "id": "green",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Filled Cube",
            "href": "https://docs.google.com/document/d/1OrYR_tQXhRpL-pzGRqhM1wpJkVe0Qn3SX2nfcqfvWv0/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Blue",
        "id": "blue",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Touch Stone",
            "href": "https://docs.google.com/document/d/1pyKAVGxhhAdIlh24G8zPcXu-yl7hciWN7HIAZTUs5jA/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Purple",
        "id": "purple",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Finishing",
            "href": "https://docs.google.com/document/d/1NSM3ctQB_YjTxcnqILpmdczwvcTzf_UzTbY3WXN8j0Q/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Brown",
        "id": "brown",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Replicate Desk Item",
            "href": "https://docs.google.com/document/d/1Qi-7Ht8BglI8NinXAua0_Wb_IHTuOMyyq4kfGSgvSLc/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
      },
      {
        "name": "Black",
        "id": "black",
        "items": [
          // Project rows listed under this belt.
          {
            "title": "Human/Animal Sculpture",
            "href": "https://docs.google.com/document/d/1fBGlOvx904XiWFO-_pvBuOdYJy2JgbG19urWJj5I7A0/edit?usp=sharing",
            "type": "resource"
          }
        ],
        "count": 1
        // Number of project rows in this belt.
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
function placeholder(className, label) {
  /* Create a normal image element, the same kind of tag as <img> in HTML. */
  const img = document.createElement('img');

  /* Give the image a CSS class so styles.css knows how large it should be. */
  img.className = className;

  /* Point the image to the shared imageSlot file. */
  img.src = placeholderSrc;

  /* Leave alt text blank because this is not meaningful content yet. Once real photos are added, each image should get useful alt text. */
  img.alt = '';

  /* Lazy loading tells the browser it can wait to load images until they are needed. This is helpful when the page has many rows. */
  img.loading = 'lazy';

  /* aria-hidden hides this decorative image slot from assistive technology. */
  img.setAttribute('aria-hidden', 'true');

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
    anchor.append(placeholder('quickLinkImage', `${link.label} image`), document.createTextNode(link.label));

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
    button.appendChild(placeholder('cardImage', `${category.name} image`));

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
      if (!belt.items.length) return;

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

      /* Create a container for the project/resource rows inside this belt. */
      const list = el('div', 'projectList');
      list.id = beltPanelId;

      /* Loop through every project/resource in this belt and create one clickable row for each item. */
      belt.items.forEach((item) => {
        /* Create the project link row. The project type is also added as a class in case it needs unique styling later. */
        const anchor = el('a', `project ${projectTypeClassName(item.type)}`);

        /* Use the item's link when present, otherwise keep the row on the current page. */
        anchor.href = item.href || '#';
        setExternal(anchor);

        /* Add a blank project image slot to the left side of the row. */
        anchor.appendChild(placeholder('projectImage', `${item.title} image`));

        /* Create the text area for the row: title on top, type label below. */
        const copy = el('span', 'projectCopy');
        copy.append(el('span', 'projectName', item.title), el('span', 'projectType', item.type));

        /* Put the text area into the link, then put the completed link into the belt's project list. */
        anchor.appendChild(copy);
        list.appendChild(anchor);
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
