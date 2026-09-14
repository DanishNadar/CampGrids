"""Export a Camp Grids workbook sheet to the standardized Mother Grid CSV that the
administration workspace imports.

    python scripts/exportMotherGrid.py "Fab Lab Camp Grids.xlsx"
    python scripts/exportMotherGrid.py workbook.xlsx --sheet Projects --out assets/mother-grid-template.csv

Layout written, matching the workbook:
    row 1    - blank first cell, then one category per column
    column A - the belt name on the first row of each belt band, blank to continue it
    cells    - "Project name: Instructions | https://..."

The resource links are stored as Excel hyperlinks, not as cell text. That is why this
script loads the workbook twice: data_only=True returns the cached display string, and
the default load is the only one that exposes .hyperlink. Exporting a sheet by hand, or
with only .value, silently produces a Grid with no links at all.
"""
import argparse
import csv
import io
import os
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

BELTS = {"white", "yellow", "orange", "green", "blue", "purple", "brown", "black"}


def main():
    parser = argparse.ArgumentParser(description="Export a workbook sheet to the Mother Grid CSV.")
    parser.add_argument("workbook", help="path to the .xlsx workbook")
    parser.add_argument("--sheet", default="Projects", help="worksheet name (default: Projects)")
    parser.add_argument("--out", default=os.path.join("assets", "mother-grid-template.csv"),
                        help="output CSV path (default: assets/mother-grid-template.csv)")
    args = parser.parse_args()

    if not os.path.exists(args.workbook):
        sys.exit(f"workbook not found: {args.workbook}")

    values = openpyxl.load_workbook(args.workbook, data_only=True)
    if args.sheet not in values.sheetnames:
        sys.exit(f"sheet {args.sheet!r} not in workbook. Available: {', '.join(values.sheetnames)}")
    sheet = values[args.sheet]
    links = openpyxl.load_workbook(args.workbook)[args.sheet]

    # Row 1 holds the category names and stops at the first blank column.
    categories = []
    for col in range(2, sheet.max_column + 1):
        value = sheet.cell(row=1, column=col).value
        if value is None or not str(value).strip():
            break
        categories.append((col, " ".join(str(value).split())))
    if not categories:
        sys.exit("row 1 of the sheet names no categories, starting at column B")
    if len(categories) > 24:
        sys.exit(f"the Grid supports up to 24 category columns; this sheet has {len(categories)}")

    rows = [[""] + [name for _, name in categories]]
    linked = 0
    belts_seen = []

    for r in range(2, sheet.max_row + 1):
        label = sheet.cell(row=r, column=1).value
        label = str(label).strip() if label else ""
        if label and label.lower() in BELTS:
            belts_seen.append(label)
        line = [label]
        for col, _ in categories:
            text = sheet.cell(row=r, column=col).value
            text = " ".join(str(text).split()) if text is not None else ""
            # A formula with no cached result is not usable content.
            if text.startswith("="):
                text = ""
            hyperlink = links.cell(row=r, column=col).hyperlink
            target = (hyperlink.target or "").strip() if hyperlink is not None else ""
            if text and target:
                line.append(f"{text} | {target}")
                linked += 1
            else:
                line.append(text)
        if any(cell for cell in line):
            rows.append(line)

    directory = os.path.dirname(os.path.abspath(args.out))
    if directory and not os.path.isdir(directory):
        os.makedirs(directory)
    with io.open(args.out, "w", encoding="utf8", newline="") as handle:
        csv.writer(handle).writerows(rows)

    populated = sum(1 for line in rows[1:] for cell in line[1:] if cell)
    print(f"wrote {args.out}")
    print(f"  {len(categories)} category columns, {len(rows) - 1} data rows")
    print(f"  {populated} populated cells, {linked} carrying a URL")
    print(f"  belts found in column A: {', '.join(belts_seen) if belts_seen else 'NONE - the import will reject this sheet'}")
    if not linked:
        print("  warning: no hyperlinks were found, so the imported Grid would have no resource links")


if __name__ == "__main__":
    main()
