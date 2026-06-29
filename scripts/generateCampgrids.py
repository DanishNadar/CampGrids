# This import keeps type-hint behavior predictable across Python versions.
from __future__ import annotations

# These imports are the standard-library tools used to read Excel-as-XML, clean text, build JavaScript data, and work with file paths.
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


# This picks the workbook path from the command-line argument; sys.argv[0] is the script name, so sys.argv[1] is the first real input.
workbook = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("CampGrids.xlsx")
# This points to the JavaScript file that will receive the rebuilt campData block.
scriptFile = Path("script.js")
# This points to the folder where category and resource images are stored.
assetsDir = Path("assets")
# This is the internal XML path for the first worksheet inside an .xlsx file, because .xlsx files are actually zipped folders of XML files.
sheetFile = "xl/worksheets/sheet1.xml"
# This is the internal XML path for worksheet relationships, which is where Excel stores hyperlink targets for cells.
sheetRelsFile = "xl/worksheets/_rels/sheet1.xml.rels"

# These namespace shortcuts let ElementTree find XML tags without writing the full long URL every time.
ns = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# These belt names define the only belt rows the importer treats as section headers.
belts = ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black"]
# These short belt codes are used for standardized image filenames such as Notebooking_WT.png or OrigamiFigure_BU_TraditionalCrane.png.
beltImageCodes = {
    "White": ["WT", "WH", "WHITE"],
    "Yellow": ["YW", "YL", "YE", "YELLOW"],
    "Orange": ["OR", "OG", "ORANGE"],
    "Green": ["GR", "GN", "GREEN"],
    "Blue": ["BU", "BL", "BLUE"],
    "Purple": ["PU", "PR", "PURPLE"],
    "Brown": ["BN", "BR", "BROWN"],
    "Black": ["BK", "BLK", "BLACK"],
}
# These are the image extensions the importer will consider when scanning the assets folder.
imageExtensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
# These colors are assigned to category cards from left to right; if there are more categories than colors, the list wraps around.
colors = [
    "#f7c948",
    "#ff8a3d",
    "#ff6b6b",
    "#d95fcd",
    "#8b5cf6",
    "#4f46e5",
    "#2563eb",
    "#0ea5e9",
    "#14b8a6",
    "#22c55e",
    "#84cc16",
    "#eab308",
    "#f97316",
    "#ef4444",
    "#ec4899",
    "#a855f7",
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#65a30d",
    "#d97706",
    "#047857",
]

# These descriptions are shown at the top of opened category cards; categories not listed here use a generic fallback sentence.
descriptions = {
    "Notebooking": "Sketch, record, reflect, and document maker work.",
    "Origami (Figure)": "Fold animals, figures, and paper characters.",
    "Origami (Modular)": "Build geometric forms from repeated paper units.",
    "Paper Craft": "Make playful paper models and moving paper projects.",
    "Paper Flight": "Design, fold, and test flying paper builds.",
    "Popsicle Sticks": "Create structures, mechanisms, toys, and models.",
    "Fiber Art": "Explore yarn, crochet, weaving, and textile projects.",
    "Hands-On Science": "Try experiments, challenges, and physical science builds.",
    "3D Printing 101 (Prusa Mini)": "Design, slice, and print beginner 3D models.",
    "Vinyl Cutting (Cameo)": "Create decals and cut designs with vinyl tools.",
    "Laser Cutting 101 (Muse)": "Learn laser safety, files, and cut projects.",
    "Digital Embroidery 101 (Brother PE800)": "Hoop, thread, stitch, and finish embroidery projects.",
    "Electronics 101": "Build circuits, lights, and electronics experiments.",
    "Mechatronics": "Combine mechanisms, motion, gears, and controls.",
    "Engineering 101": "Design, build, test, and improve engineering solutions.",
    "Turtle Stitch": "Use code-driven stitching and shape-based embroidery.",
    "Block Coding 101 (scratch)": "Create animations, stories, games, and interactive code.",
    "Pygamer": "Build and test handheld MakeCode Arcade projects.",
    "Circuit Playground": "Program sensors, lights, sounds, and devices.",
    "Lego": "Prototype towers, vehicles, structures, and robots.",
    "Pipe Cleaners": "Make flexible figures, flowers, and sculptures.",
    "3D Pen": "Draw, repair, and sculpt with a handheld 3D pen.",
}


# This normalizes spreadsheet text so quotes, dashes, extra spaces, and hidden Unicode do not break the generated JavaScript.
def cleanText(value: str) -> str:
    # This converts None or any non-string value into a string so the rest of the function can treat everything the same way.
    value = str(value or "")
    # This loop replaces curly quotes, long dashes, and non-breaking spaces with simple ASCII characters that are safer in code.
    for old, new in {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u00a0": " ",
    }.items():
        value = value.replace(old, new)
    # This line decomposes Unicode characters, removes anything non-ASCII, then turns the bytes back into a regular string.
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    # This regex replaces any run of whitespace with one normal space, then strip() removes spaces from the start and end.
    return re.sub(r"\s+", " ", value).strip()


# This turns a display name into an id-safe value, such as "Paper Flight" becoming "paper-flight".
def slug(value: str) -> str:
    # This first cleans the text and lowercases it because ids should be predictable and case-insensitive.
    value = cleanText(value).lower()
    # This regex replaces every group of non-letter/non-number characters with one hyphen, then strips hyphens from the edges.
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    # This fallback prevents an empty id if the source cell had no usable letters or numbers.
    return value or "item"


# This turns a name into an image lookup key, so "Origami (Figure)_Cover" and "OrigamiFigure Cover" can match the same asset.
def imageKey(value: str) -> str:
    # This cleans the text, lowercases it, and removes every non-letter/non-number character so filenames can ignore spaces, dashes, and parentheses.
    return re.sub(r"[^a-z0-9]+", "", cleanText(value).lower())


# This scans the assets folder once and builds a lookup table from normalized filename stems to browser-ready paths.
def imageAssets() -> dict[str, str]:
    # This dictionary maps normalized names like "notebookingcover" to paths like "assets/Notebooking_Cover.png".
    found = {}
    # This quietly returns an empty lookup if the assets folder does not exist yet.
    if not assetsDir.exists():
        return found
    # This checks only files directly inside assets, leaving sample process diagrams alone.
    for file in sorted(assetsDir.iterdir()):
        # This skips folders, unsupported files, and the shared placeholder image.
        if not file.is_file() or file.suffix.lower() not in imageExtensions or file.name.lower() == "placeholder.jpg":
            continue
        # This stores the first matching file for each normalized name so the output is stable.
        found.setdefault(imageKey(file.stem), file.as_posix())
    # This returns the completed image lookup table.
    return found


# This returns the first image path matching one of the proposed standardized filename stems.
def findImage(assets: dict[str, str], candidates: list[str]) -> str:
    # This tries each candidate in order, which lets more specific names win before broader fallbacks.
    for candidate in candidates:
        # This normalizes the candidate exactly like real filenames were normalized.
        key = imageKey(candidate)
        # This returns the asset path as soon as a matching file exists.
        if key in assets:
            return assets[key]
    # This empty string tells the browser renderer to use the normal placeholder fallback.
    return ""


# This finds the cover image for a category card, such as Notebooking_Cover.png.
def categoryImage(assets: dict[str, str], categoryName: str) -> str:
    # This tries the standard cover pattern first, then a plain category filename as a forgiving fallback.
    return findImage(assets, [f"{categoryName}_Cover", f"{categoryName} Cover", categoryName])


# This finds an image for a resource row by category, belt, and item title, such as OrigamiFigure_BU_TraditionalCrane.png for a specific blue-belt project.
def itemImage(assets: dict[str, str], categoryName: str, beltName: str, title: str) -> str:
    # This removes labels like Instructions and Video so one project-specific image can match both rows in an instruction/video pair.
    projectName = seriesTitle(title)
    # This starts with the most specific filenames, using the extra underscore convention for separate projects inside the same belt.
    candidates = [f"{categoryName}_{code}_{projectName}" for code in beltImageCodes.get(beltName, [])]
    # This also tries category-plus-full-belt-name-plus-project in case future images use full belt words instead of short codes.
    candidates.append(f"{categoryName}_{beltName}_{projectName}")
    # This then tries project-only fallbacks for images named directly after the resource.
    candidates.extend([f"{categoryName}_{title}", f"{categoryName}_{projectName}", title, projectName])
    # This finally tries broad belt-level images, which are useful only when one image is meant to represent the whole belt.
    candidates.extend([f"{categoryName}_{code}" for code in beltImageCodes.get(beltName, [])])
    candidates.append(f"{categoryName}_{beltName}")
    # This returns the first matching row image, or an empty string if no asset exists.
    return findImage(assets, candidates)


# This converts Excel cell letters into a number, so A becomes 1, B becomes 2, AA becomes 27, and so on.
def columnNumber(cellRef: str) -> int:
    # This regex grabs only the starting letters from a cell reference like "C12", ignoring the row number.
    letters = re.match(r"([A-Z]+)", cellRef).group(1)
    # This starts the running total before reading each column letter.
    total = 0
    # This loop treats Excel letters like base-26 digits, so each new letter shifts the total and adds the letter value.
    for char in letters:
        total = total * 26 + ord(char) - 64
    # This returns the final column number used as the dictionary key later.
    return total


# This reads Excel's shared string table, which is where many spreadsheet cell texts are stored once and referenced by number.
def readSharedStrings(zipFile: zipfile.ZipFile) -> list[str]:
    # Some spreadsheets do not have sharedStrings.xml, so this returns an empty list instead of crashing.
    if "xl/sharedStrings.xml" not in zipFile.namelist():
        return []
    # This parses the sharedStrings XML file into an ElementTree object that Python can search.
    root = ET.fromstring(zipFile.read("xl/sharedStrings.xml"))
    # This list will end up holding every reusable string in the workbook.
    strings = []
    # This loops through every shared string item; the "a:" prefix uses the namespace dictionary above.
    for item in root.findall("a:si", ns):
        # This list comprehension collects all text fragments inside one shared string, because Excel can split formatted text into multiple pieces.
        textParts = [node.text or "" for node in item.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")]
        # This joins the fragments into one normal string and stores it at the same index Excel uses in cells.
        strings.append("".join(textParts))
    # This returns the full shared string lookup table.
    return strings


# This reads hyperlink relationships so a cell like C5 can become the real URL attached to that cell.
def readHyperlinks(zipFile: zipfile.ZipFile, sheetRoot: ET.Element) -> dict[str, str]:
    # This dictionary maps Excel relationship ids like rId12 to actual URL targets.
    relTargets = {}
    # This relationship file only exists if the worksheet has links; no file means no links to import.
    if sheetRelsFile in zipFile.namelist():
        # This parses the worksheet relationship XML file.
        relRoot = ET.fromstring(zipFile.read(sheetRelsFile))
        # This loops through each relationship entry and records its id-to-target mapping.
        for rel in relRoot.findall("rel:Relationship", ns):
            relTargets[rel.attrib["Id"]] = rel.attrib.get("Target", "")

    # This dictionary maps actual cell references like "C5" to the URL that should be used on the website.
    hyperlinks = {}
    # This loops through hyperlink tags in the worksheet XML; each tag names a cell and a relationship id.
    for link in sheetRoot.findall("a:hyperlinks/a:hyperlink", ns):
        # This gets the spreadsheet cell address for the hyperlink, such as "C5".
        cellRef = link.attrib.get("ref")
        # This gets the relationship id; the long namespace key is how ElementTree represents the r:id XML attribute.
        relId = link.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        # This only saves the hyperlink if both the cell reference and matching URL target exist.
        if cellRef and relId in relTargets:
            hyperlinks[cellRef] = relTargets[relId]
    # This returns a lookup table used while reading normal cell values.
    return hyperlinks


# This reads the worksheet rows and returns a structured list of row numbers plus cell values keyed by column number.
def readRows(workbook: Path) -> list[tuple[int, dict[int, dict[str, str]]]]:
    # This opens the .xlsx file as a zip file because Excel workbooks are zip archives internally.
    with zipfile.ZipFile(workbook) as zipFile:
        # This loads the shared string table before reading cells that may point into it.
        shared = readSharedStrings(zipFile)
        # This parses the main worksheet XML into a searchable tree.
        sheetRoot = ET.fromstring(zipFile.read(sheetFile))
        # This reads hyperlinks after the worksheet tree exists, because hyperlink tags live inside that tree.
        hyperlinks = readHyperlinks(zipFile, sheetRoot)

        # This list will hold every non-empty row as the importer sees it.
        rows = []
        # This loops through every row element in the sheetData section of the worksheet XML.
        for row in sheetRoot.findall("a:sheetData/a:row", ns):
            # This dictionary stores the non-empty cells in the current row, using column number as the key.
            values = {}
            # This loops through each cell in the row.
            for cell in row.findall("a:c", ns):
                # This finds the cell's value element; cells without a value are skipped.
                valueNode = cell.find("a:v", ns)
                # This skips blank cells because they do not create categories, belts, or project rows.
                if valueNode is None:
                    continue
                # This starts with the raw value text from the XML.
                value = valueNode.text or ""
                # This checks whether the cell type is "s", meaning the value is an index into sharedStrings.xml instead of the final text.
                if cell.attrib.get("t") == "s":
                    value = shared[int(value)]
                # This cleans the final cell text so the generated JavaScript is stable and ASCII-safe.
                value = cleanText(value)
                # This ignores cells that become empty after cleaning.
                if value:
                    # This gets the cell reference like "B2" from the XML attributes.
                    cellRef = cell.attrib["r"]
                    # This stores the visible value and any hyperlink URL under the numeric column for easy processing later.
                    values[columnNumber(cellRef)] = {
                        "value": value,
                        "url": hyperlinks.get(cellRef, ""),
                    }
            # This stores only rows that had at least one meaningful cell.
            if values:
                rows.append((int(row.attrib["r"]), values))
        # This returns all meaningful worksheet rows in order.
        return rows


# This guesses the resource type shown in the little pill label on each project row.
def itemType(title: str) -> str:
    # This lowercases the title so checks like "Video" and "video" behave the same.
    lower = title.lower()
    # This marks anything with "video" in the title as a video.
    if "video" in lower:
        return "video"
    # This fallback treats every non-video item as a resource, including Google Docs such as TinkerCAD setup.
    return "resource"


# This removes labels like Instructions and Video so related rows can become one series group.
def seriesTitle(title: str) -> str:
    # This removes a leading number like "1." because numbered items are grouped separately as parts.
    title = re.sub(r"^\d+\.\s*", "", title).strip()
    # This removes common trailing resource labels after a colon, such as ": Instructions", ": Video", or ": Videos".
    title = re.sub(r"\s*:\s*(instructions?|videos?|manual|instructable(?:\s+w/\s*video)?)\s*$", "", title, flags=re.IGNORECASE).strip()
    # This removes common trailing resource labels without a colon.
    title = re.sub(r"\s+(instructions?|videos?)\s*$", "", title, flags=re.IGNORECASE).strip()
    # This removes a leading OR marker so alternate video labels still group under the meaningful title.
    title = re.sub(r"^OR\s+", "", title, flags=re.IGNORECASE).strip()
    # This returns the cleaned title or a generic fallback if the source text became empty.
    return title or "Resource"


# This turns a group title into a stable id suffix for aria-controls values.
def groupId(value: str, index: int) -> str:
    # This combines the position with a slug so repeated group names still get unique ids.
    return f"group-{index + 1}-{slug(value)}"


# This takes flat project rows inside one belt and creates rectangular group sections such as Part 1, Part 2, or Jumping Frog.
def groupItems(items: list[dict]) -> list[dict]:
    # This list will hold the final grouped structures used by the frontend.
    groups = []
    # This stores the group currently being filled while reading consecutive rows.
    currentGroup = None
    # This stores the comparison key for the current group so consecutive matching resources stay together.
    currentKey = ""

    # This loops through each project row in the same order it appeared in the workbook.
    for item in items:
        # This checks for numbered resources like "1. Introduction" or "2. Your Name".
        numberMatch = re.match(r"^(\d+)\.\s*(.*)", item["title"])
        # This builds a part group for numbered rows, otherwise a series group from the cleaned resource name.
        if numberMatch:
            key = f"part-{numberMatch.group(1)}"
            title = f"Part {numberMatch.group(1)}"
        else:
            title = seriesTitle(item["title"])
            key = f"series-{slug(title)}"

        # This starts a new group whenever the key changes, which keeps only consecutive matching series together.
        if key != currentKey:
            currentGroup = {"id": groupId(title, len(groups)), "title": title, "items": []}
            groups.append(currentGroup)
            currentKey = key

        # This adds the current project row to the active group.
        currentGroup["items"].append(item)

    # This adds a count to each group so the rectangular section heading can show how many rows it contains.
    for group in groups:
        group["count"] = len(group["items"])
    # This returns the nested group list for one belt.
    return groups


# This converts raw worksheet rows into the campData structure that script.js renders.
def buildData(rows: list[tuple[int, dict[int, dict[str, str]]]]) -> list[dict]:
    # This scans available assets before reading rows so images can be attached while the site data is built.
    assets = imageAssets()
    # This uses the first non-empty row as the category header row.
    header = rows[0][1]
    # This list will hold the final category objects.
    categories = []
    # This loops from column B to the last header column, because column A is reserved for belt names.
    for col in range(2, max(header.keys()) + 1):
        # This skips columns that do not have a category name in the header.
        if col not in header:
            continue
        # This reads and cleans the category name from the header cell.
        name = cleanText(header[col]["value"])
        # This appends a new category object, including one empty belt object for each standard belt color.
        categories.append({
            "col": col,
            "id": slug(name),
            "name": name,
            "description": descriptions.get(name, "Camp project resources and activities."),
            "color": colors[(col - 2) % len(colors)],
            "image": categoryImage(assets, name),
            "belts": [{"name": belt, "id": slug(belt), "items": []} for belt in belts],
        })

    # This dictionary makes it fast to find a category object by its spreadsheet column number.
    byCol = {category["col"]: category for category in categories}
    # This tracks the active belt while reading rows, because many project rows leave column A blank but still belong to the previous belt.
    currentBelt = ""
    # This set prevents duplicate project entries if the same title/link appears more than once under the same category and belt.
    seen = set()

    # This loops through all rows after the header row.
    for _, values in rows[1:]:
        # This updates the active belt whenever column A contains one of the recognized belt names.
        if 1 in values and values[1]["value"] in belts:
            currentBelt = values[1]["value"]
        # This skips rows before the first belt heading, if any exist.
        if not currentBelt:
            continue

        # This finds the index of the active belt so projects can be added to the right belt object.
        beltIndex = belts.index(currentBelt)
        # This loops through every non-empty cell in the row.
        for col, cell in values.items():
            # This skips column A and skips any column that is not one of the category columns.
            if col == 1 or col not in byCol:
                continue
            # This cleans the project title from the cell.
            title = cleanText(cell["value"])
            # This uses the cell hyperlink if present; otherwise direct URL text becomes its own link, and normal text becomes a harmless "#".
            href = cell["url"] or (title if title.startswith(("http://", "https://")) else "#")
            # This tuple uniquely identifies a project inside one category and belt so duplicates can be filtered.
            key = (col, currentBelt, title, href)
            # This skips the item if that exact category/belt/title/link has already been imported.
            if key in seen:
                continue
            # This records the item as seen before adding it to the data.
            seen.add(key)
            # This labels the row before choosing an image because videos should never receive resource image placeholders.
            resourceType = itemType(title)
            # This appends the project row to the active category and active belt.
            byCol[col]["belts"][beltIndex]["items"].append({
                "title": title,
                "href": href,
                "type": resourceType,
                "image": itemImage(assets, byCol[col]["name"], currentBelt, title) if resourceType == "resource" else "",
            })

    # This final pass calculates counts and removes the temporary spreadsheet column number from each category.
    for category in categories:
        # This sums every belt's item count to get the total number shown on the category card.
        category["count"] = sum(len(belt["items"]) for belt in category["belts"])
        # This stores the item count on each belt so the belt button can show "4 items", "6 items", and so on.
        for belt in category["belts"]:
            belt["count"] = len(belt["items"])
            belt["groups"] = groupItems(belt["items"])
            del belt["items"]
        # This deletes the internal column number because the browser does not need to know the spreadsheet column.
        del category["col"]
    # This returns the complete browser-ready category list.
    return categories


# This turns Python data into JavaScript text and inserts explanatory comments into the generated campData block.
def emitData(categories: list[dict]) -> str:
    # This converts the Python list/dicts into pretty-printed JSON lines, which are also valid JavaScript object syntax.
    lines = json.dumps(categories, indent=2).splitlines()
    # This will hold the JSON lines plus extra comments placed under important structural lines.
    commented = []
    # This loops over each generated JSON line so comments can be inserted immediately after selected lines.
    for line in lines:
        # This always keeps the original data line first.
        commented.append(line)
        # This removes indentation so structural comparisons are easier.
        stripped = line.strip()
        # This captures the current line's indentation so inserted comments line up with nearby data.
        indent = line[: len(line) - len(line.lstrip())]
        # This adds a comment under every belts array because belts are the subDropdown sections inside a category.
        if stripped == '"belts": [':
            commented.append(f"{indent}  // Belt sections shown inside this category card.")
        # This adds a comment under every groups array because groups are the lighter rectangular section boxes inside a belt.
        elif stripped == '"groups": [':
            commented.append(f"{indent}  // Rectangular group sections shown inside this belt.")
        # This adds a comment under every items array because items are the actual project/resource rows inside a group or belt.
        elif stripped == '"items": [':
            commented.append(f"{indent}  // Project rows listed under this section.")
        # This regex finds count lines like '"count": 4' so the generated data explains what each count means.
        elif re.match(r'"count": \d+', stripped):
            # This indentation check distinguishes category-level counts from deeper belt-level counts.
            if len(indent) <= 4:
                commented.append(f"{indent}// Total project rows in this category.")
            else:
                commented.append(f"{indent}// Number of project rows in this section.")
    # This joins all data and comment lines into one JavaScript-ready block of text.
    return "\n".join(commented)


# This replaces only the campData block in script.js while leaving the hand-written rendering code alone.
def replaceCampData(scriptText: str, dataText: str) -> str:
    # This finds where the campData declaration begins in script.js.
    start = scriptText.index("const campData = ")
    # This finds the next major comment after campData, which marks the end of the generated block.
    end = scriptText.index("\n\n/* This helper", start)
    # This stitches together the old script before campData, the new generated campData, and the old script after campData.
    return scriptText[:start] + "const campData = " + dataText + ";" + scriptText[end:]


# This is the main command-line workflow for rebuilding script.js from the provided workbook.
def main() -> None:
    # This stops immediately if the workbook path passed to the script does not exist.
    if not workbook.exists():
        raise SystemExit(f"Workbook not found: {workbook}")
    # This stops immediately if script.js is missing, because there would be nowhere to write the generated data.
    if not scriptFile.exists():
        raise SystemExit(f"Script file not found: {scriptFile}")

    # This reads workbook rows, converts them to browser data, and stores the final category list.
    data = buildData(readRows(workbook))
    # This reads the existing JavaScript file so only the generated data block can be replaced.
    script = scriptFile.read_text(encoding="utf-8")
    # This writes script.js back out with the updated campData block.
    scriptFile.write_text(replaceCampData(script, emitData(data)), encoding="utf-8")
    # This calculates the total number of resource rows imported across every category.
    total = sum(category["count"] for category in data)
    # This prints a short success summary for the batch file and terminal.
    print(f"Updated {scriptFile} from {workbook}: {len(data)} categories, {total} resources.")


# This runs main() only when the file is executed directly, not if another Python file imports it.
if __name__ == "__main__":
    main()
