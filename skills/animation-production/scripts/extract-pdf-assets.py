#!/usr/bin/env python3
"""Extract PDF image XObjects at their native pixel dimensions.

Requires Poppler's `pdfimages`. Images are decoded to PNG without resampling so
the result keeps the embedded pixel dimensions while remaining browser-safe.
Mask and soft-mask objects are recorded for review instead of being presented as
standalone visual candidates.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path


ROW_RE = re.compile(
    r"^\s*(?P<page>\d+)\s+(?P<num>\d+)\s+(?P<role>image|mask|smask)\s+"
    r"(?P<width>\d+)\s+(?P<height>\d+)\s+(?P<color>\S+)\s+"
    r"(?P<components>\d+)\s+(?P<bits>\d+)\s+(?P<encoding>\S+)\s+"
    r"(?P<interpolation>\S+)\s+(?P<object>\d+)\s+(?P<generation>\d+)\s+"
    r"(?P<xppi>\S+)\s+(?P<yppi>\S+)\s+(?P<size>\S+)\s+(?P<ratio>\S+)\s*$"
)


def parse_listing(text: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for line in text.splitlines():
        match = ROW_RE.match(line)
        if not match:
            continue
        row: dict[str, object] = match.groupdict()
        for key in ("page", "num", "width", "height", "components", "bits", "object", "generation"):
            row[key] = int(str(row[key]))
        row["interpolation"] = str(row["interpolation"]).lower() == "yes"
        rows.append(row)
    return rows


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a valid PNG: {path}")
    return struct.unpack(">II", header[16:24])


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract native PDF image XObjects and write an asset manifest.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--document-id", help="Stable source document ID; defaults to the PDF filename stem.")
    args = parser.parse_args()

    pdfimages = shutil.which("pdfimages")
    if not pdfimages:
        parser.error("Poppler pdfimages is required. Install Poppler or use a high-resolution rendered crop fallback.")

    pdf = args.pdf.resolve()
    output = args.output.resolve()
    if not pdf.is_file():
        parser.error(f"PDF does not exist: {pdf}")
    output.mkdir(parents=True, exist_ok=True)
    prefix = output / "image"

    listing = subprocess.run(
        [pdfimages, "-list", str(pdf)], check=True, capture_output=True, text=True
    ).stdout
    rows = parse_listing(listing)
    subprocess.run([pdfimages, "-png", str(pdf), str(prefix)], check=True)

    files = sorted(output.glob("image-*.png"))
    if len(files) != len(rows):
        raise RuntimeError(
            f"pdfimages listed {len(rows)} objects but wrote {len(files)} PNG files; "
            "use a high-resolution rendered crop for this PDF and record the mismatch."
        )

    document_id = args.document_id or re.sub(r"[^a-z0-9]+", "-", pdf.stem.lower()).strip("-") or "source-pdf"
    assets: list[dict[str, object]] = []
    for row, path in zip(rows, files):
        width, height = png_dimensions(path)
        expected = (int(row["width"]), int(row["height"]))
        if (width, height) != expected:
            raise RuntimeError(f"Decoded size mismatch for {path.name}: {(width, height)} != {expected}")
        page = int(row["page"])
        number = int(row["num"])
        role = str(row["role"])
        assets.append(
            {
                "id": f"asset-p{page:03d}-xobject-{number:03d}",
                "uri": path.name,
                "sha256": digest(path),
                "width": width,
                "height": height,
                "extraction": "native-xobject",
                "role": role,
                "standaloneCandidate": role == "image",
                "requiresCompositionReview": role in {"mask", "smask"},
                "source": {
                    "documentId": document_id,
                    "page": page,
                    "objectId": f"{row['object']} {row['generation']} R",
                    "imageNumber": number,
                    "encoding": row["encoding"],
                    "colorSpace": row["color"],
                    "bitsPerComponent": row["bits"],
                },
            }
        )

    manifest = {
        "version": 1,
        "document": {
            "id": document_id,
            "name": pdf.name,
            "sha256": digest(pdf),
            "extractor": "poppler-pdfimages",
        },
        "assets": assets,
    }
    manifest_path = output / "pdf-image-assets.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Extracted {len(assets)} PDF image object(s) to {output}")
    print(f"Manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"pdfimages failed with exit code {error.returncode}", file=sys.stderr)
        raise SystemExit(error.returncode)
