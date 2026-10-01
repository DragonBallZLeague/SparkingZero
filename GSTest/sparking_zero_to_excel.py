"""
Sparking Zero Character Data -> Excel Extractor
=================================================

Reads every character JSON file out of your four folders (Blasts,
CharData, Numerics, Skills), flattens the (sometimes messy) data into
flat rows/columns, and writes one organized .xlsx workbook with a
sheet per folder plus an "Index" overview sheet.

HOW TO USE
----------
1. Put this script in the parent folder that contains your four
   subfolders (Blasts, CharData, Numerics, Skills) OR edit BASE_DIR
   below to point at that parent folder.
2. Install dependencies (only needs to be done once):
       pip install pandas openpyxl
3. Run it:
       python sparking_zero_to_excel.py
4. Find the result at: character_data.xlsx (next to this script)

WHAT IT HANDLES
----------------
- File encoding: these game-exported JSON files are UTF-16, this
  script auto-detects UTF-16 / UTF-8 / UTF-8-BOM automatically.
- Nested JSON: values that are themselves JSON objects/arrays get
  fully flattened into "parent.child.grandchild" style columns.
- The game's hybrid "Label: value | Label: {json}" pseudo-format
  (seen in Skills/Blasts data) gets parsed into real key/value pairs
  too, instead of dumping one giant unreadable text blob per cell.
- Character name + category are pulled from the filename itself,
  expected as: "<Character Name> [<Category>].json"
  e.g. "Goku (Z - Mid), Super Saiyan [Skills].json"
"""

import json
import math
import re
from pathlib import Path

import pandas as pd

# ----------------------------------------------------------------------
# CONFIG - edit these if your folder layout / names differ
# ----------------------------------------------------------------------

# Folder containing the 4 subfolders. "." means "the folder this
# script is sitting in".
BASE_DIR = Path(".")

# Your 4 subfolder names, and the sheet name each will get in Excel.
FOLDERS = ["Blasts", "CharacterData", "Numerics", "Skills"]

# Where to write the finished workbook.
OUTPUT_FILE = BASE_DIR / "character_data.xlsx"

# Excel has a hard limit of 16384 columns per sheet. If a folder's
# flattened data would blow past this, we fall back to writing a
# single "Data" text column for that character instead of crashing.
EXCEL_MAX_COLS = 16384


# ----------------------------------------------------------------------
# FILE READING
# ----------------------------------------------------------------------

def read_json_file(path: Path):
    """Read a JSON file, auto-detecting UTF-16 / UTF-8 / UTF-8-BOM."""
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        text = raw.decode("utf-16")
    elif raw.startswith(b"\xef\xbb\xbf"):
        text = raw.decode("utf-8-sig")
    else:
        text = raw.decode("utf-8")
    return json.loads(text)


NAME_PATTERN = re.compile(r"^(.*?)\s*\[(.*)\]\s*$")


def parse_filename(path: Path):
    """Pull (character_name, category) out of 'Name [Category].json'.
    Falls back to (filename, folder) if the pattern doesn't match."""
    stem = path.stem
    m = NAME_PATTERN.match(stem)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return stem, path.parent.name


# ----------------------------------------------------------------------
# THE MESSY PART: flattening nested JSON + the game's pseudo-format
# strings ("Label: value | Label2: {json...}") into clean columns
# ----------------------------------------------------------------------

_decoder = json.JSONDecoder()


def _split_top_level_pipe(s: str):
    """Split a string on '|' but only at brace-depth 0, so we don't
    break apart JSON blobs that happen to contain '|' inside them."""
    parts, depth, current = [], 0, []
    for ch in s:
        if ch == "{":
            depth += 1
            current.append(ch)
        elif ch == "}":
            depth -= 1
            current.append(ch)
        elif ch == "|" and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return [p.strip() for p in parts if p.strip()]


def _parse_pseudo_format(s: str):
    """Parse 'Label: value | Label2: value2' style strings into a dict,
    recursively smart-parsing each value too."""
    result = {}
    for i, segment in enumerate(_split_top_level_pipe(s)):
        if ":" in segment:
            label, _, rest = segment.partition(":")
            label, rest = label.strip(), rest.strip()
            key = label or f"field{i}"
            result[key] = _smart_parse(rest) if rest else rest
        elif segment:
            result[f"field{i}"] = _smart_parse(segment)
    return result


def _smart_parse(value):
    """Best-effort parse of a string value that might be:
      - pure JSON ({...} or [...])
      - pure pseudo pipe-format ('Label: val | Label2: val2')
      - a JSON object immediately followed by trailing pseudo
        pipe-format text (common in the Blasts data)
      - or just plain text, in which case it's returned unchanged.
    """
    if not isinstance(value, str):
        return value
    s = value.strip()
    if not s:
        return value

    if s[0] in "{[":
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            try:
                obj, idx = _decoder.raw_decode(s)
            except json.JSONDecodeError:
                obj = None
                idx = 0
            if obj is not None:
                remainder = s[idx:].strip().lstrip("|").strip()
                if remainder:
                    tail = _parse_pseudo_format(remainder)
                    if isinstance(obj, dict):
                        merged = dict(obj)
                        merged.update(tail)
                        return merged
                    return {"value": obj, **tail}
                return obj

    if ":" in s and "|" in s:
        return _parse_pseudo_format(s)

    return value


def flatten(obj, prefix="", out=None):
    """Recursively flatten nested dict/list/pseudo-format data into a
    single-level dict of {"a.b.c": value, "a.list[0]": value, ...}."""
    if out is None:
        out = {}
    obj = _smart_parse(obj)
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}.{k}" if prefix else str(k)
            flatten(v, new_key, out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            flatten(v, f"{prefix}[{i}]", out)
    else:
        out[prefix] = obj
    return out


# ----------------------------------------------------------------------
# MAIN EXTRACTION
# ----------------------------------------------------------------------

def process_folder(folder_path: Path):
    """Read every .json file in a folder, flatten it, return a DataFrame
    with one row per character."""
    rows = []
    errors = []
    json_files = sorted(folder_path.glob("*.json"))

    for path in json_files:
        try:
            data = read_json_file(path)
        except Exception as e:  # noqa: BLE001 - report and keep going
            errors.append((path.name, str(e)))
            continue

        char_name, category = parse_filename(path)
        flat = flatten(data)

        row = {"Character": char_name, "SourceFile": path.name}
        row.update(flat)
        rows.append(row)

    if errors:
        print(f"  ! {len(errors)} file(s) in {folder_path.name} failed to parse:")
        for fname, err in errors:
            print(f"      - {fname}: {err}")

    if not rows:
        return pd.DataFrame(columns=["Character", "SourceFile"])

    df = pd.DataFrame(rows)

    # Keep Character/SourceFile as the first two columns, rest sorted
    # alphabetically so related fields land near each other.
    other_cols = sorted(c for c in df.columns if c not in ("Character", "SourceFile"))
    df = df[["Character", "SourceFile"] + other_cols]

    # Guard against Excel's column limit on very deep data.
    if len(df.columns) > EXCEL_MAX_COLS:
        print(f"  ! {folder_path.name} has {len(df.columns)} columns, "
              f"exceeds Excel's {EXCEL_MAX_COLS} limit — collapsing "
              f"extra fields into a single JSON text column.")
        keep = df[["Character", "SourceFile"]].copy()
        extra_cols = other_cols
        keep["ExtraFieldsJSON"] = df[extra_cols].apply(
            lambda r: json.dumps(r.dropna().to_dict(), default=str), axis=1
        )
        df = keep

    return df


def _safe_str(v):
    """Stringify a cell value, explicitly handling NaN/None.

    df[col].astype(str) is NOT reliable for this: on object-dtype
    columns (the common case once a column mixes real values with
    missing ones) pandas can leave actual float('nan') values
    un-stringified instead of turning them into 'nan'. That silently
    produces a float sitting in a column of strings, which then blows
    up the very next time something calls len() on it. Sparse columns
    (fields only some characters have) are exactly where this bites.
    """
    if v is None:
        return ""
    if isinstance(v, float) and math.isnan(v):
        return ""
    return str(v)


def autofit_columns(writer, sheet_name, df, max_width=60):
    """Widen Excel columns to roughly fit their content (capped)."""
    worksheet = writer.sheets[sheet_name]
    for i, col in enumerate(df.columns):
        sample = df[col].head(200).map(_safe_str)
        longest = max([len(str(col))] + [len(v) for v in sample])
        worksheet.set_column(i, i, min(longest + 2, max_width))


def main():
    print(f"Reading character data from: {BASE_DIR.resolve()}")

    folder_data = {}
    for folder_name in FOLDERS:
        folder_path = BASE_DIR / folder_name
        if not folder_path.is_dir():
            print(f"  ! Skipping '{folder_name}': folder not found at {folder_path}")
            continue
        print(f"Processing folder: {folder_name}")
        df = process_folder(folder_path)
        print(f"  -> {len(df)} character file(s), {len(df.columns)} column(s)")
        folder_data[folder_name] = df

    if not folder_data:
        print("No folders found — check BASE_DIR / FOLDERS at the top of this script.")
        return

    # Build an index/overview sheet: which characters appear in which
    # folders, so you can spot missing files at a glance.
    all_characters = sorted({
        name for df in folder_data.values() for name in df["Character"]
    })
    index_rows = []
    for name in all_characters:
        row = {"Character": name}
        for folder_name, df in folder_data.items():
            row[folder_name] = "Yes" if name in set(df["Character"]) else "Missing"
        index_rows.append(row)
    index_df = pd.DataFrame(index_rows)

    print(f"Writing workbook to: {OUTPUT_FILE.resolve()}")
    with pd.ExcelWriter(OUTPUT_FILE, engine="xlsxwriter") as writer:
        index_df.to_excel(writer, sheet_name="Index", index=False)
        autofit_columns(writer, "Index", index_df)

        for folder_name, df in folder_data.items():
            # Excel sheet names are capped at 31 characters.
            sheet_name = folder_name[:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            autofit_columns(writer, sheet_name, df)

    print("Done!")


if __name__ == "__main__":
    main()