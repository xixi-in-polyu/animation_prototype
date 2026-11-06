#!/usr/bin/env python3
"""Extract native picture blobs and slide provenance from a PPTX source."""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import shutil
import struct
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def image_size(data: bytes) -> tuple[int | None, int | None]:
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":
        index = 2
        while index + 9 < len(data):
            if data[index] != 0xFF:
                index += 1
                continue
            marker = data[index + 1]
            index += 2
            if marker in (0xD8, 0xD9):
                continue
            if index + 2 > len(data):
                break
            length = int.from_bytes(data[index:index + 2], "big")
            if marker in range(0xC0, 0xC4):
                return int.from_bytes(data[index + 5:index + 7], "big"), int.from_bytes(data[index + 3:index + 5], "big")
            index += max(2, length)
    return None, None


def relationships(archive: zipfile.ZipFile, path: str) -> dict[str, str]:
    if path not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read(path))
    return {node.attrib["Id"]: node.attrib["Target"] for node in root.findall("pr:Relationship", NS)}


def normalized_box(node: ET.Element | None, slide_width: int, slide_height: int) -> dict[str, float] | None:
    if node is None:
        return None
    offset = node.find("a:off", NS)
    extent = node.find("a:ext", NS)
    if offset is None or extent is None:
        return None
    return {
        "x": round(int(offset.attrib.get("x", 0)) / slide_width, 6),
        "y": round(int(offset.attrib.get("y", 0)) / slide_height, 6),
        "width": round(int(extent.attrib.get("cx", 0)) / slide_width, 6),
        "height": round(int(extent.attrib.get("cy", 0)) / slide_height, 6),
    }


def crop_box(node: ET.Element | None) -> dict[str, float] | None:
    if node is None:
        return None
    left = int(node.attrib.get("l", 0)) / 100000
    top = int(node.attrib.get("t", 0)) / 100000
    right = int(node.attrib.get("r", 0)) / 100000
    bottom = int(node.attrib.get("b", 0)) / 100000
    if not any((left, top, right, bottom)):
        return None
    return {"x": left, "y": top, "width": 1 - left - right, "height": 1 - top - bottom}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pptx", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--document-id", default=None)
    args = parser.parse_args()

    source = args.pptx.resolve()
    output = args.output.resolve()
    assets_dir = output / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    document_id = args.document_id or source.stem.lower().replace(" ", "-")

    with zipfile.ZipFile(source) as archive:
        presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
        size = presentation.find("p:sldSz", NS)
        slide_width = int(size.attrib["cx"]) if size is not None else 12192000
        slide_height = int(size.attrib["cy"]) if size is not None else 6858000
        slide_paths = sorted(
            (name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")),
            key=lambda name: int(Path(name).stem.removeprefix("slide")),
        )
        assets: dict[str, dict] = {}
        candidates: list[dict] = []

        for slide_number, slide_path in enumerate(slide_paths, 1):
            slide = ET.fromstring(archive.read(slide_path))
            rel_path = f"ppt/slides/_rels/{Path(slide_path).name}.rels"
            rels = relationships(archive, rel_path)
            for picture_index, picture in enumerate(slide.findall(".//p:pic", NS), 1):
                props = picture.find("p:nvPicPr/p:cNvPr", NS)
                blip = picture.find("p:blipFill/a:blip", NS)
                if blip is None:
                    continue
                relationship_id = blip.attrib.get(f"{{{NS['r']}}}embed")
                target = rels.get(relationship_id or "")
                if not target:
                    continue
                media_path = posixpath.normpath(posixpath.join(posixpath.dirname(slide_path), target))
                data = archive.read(media_path)
                digest = hashlib.sha256(data).hexdigest()
                suffix = Path(media_path).suffix.lower() or ".bin"
                asset_id = f"asset-{digest[:12]}"
                output_name = f"{asset_id}{suffix}"
                width, height = image_size(data)
                if asset_id not in assets:
                    (assets_dir / output_name).write_bytes(data)
                    assets[asset_id] = {
                        "id": asset_id,
                        "name": (props.attrib.get("name") if props is not None else None) or Path(media_path).name,
                        "kind": "image",
                        "uri": f"assets/{output_name}",
                        "embedded": False,
                        "sha256": digest,
                        **({"width": width, "height": height} if width and height else {}),
                        "source": {"documentId": document_id, "slide": slide_number, "objectId": props.attrib.get("id") if props is not None else None, "extraction": "native"},
                    }
                candidates.append({
                    "id": f"slide-{slide_number:03d}-picture-{picture_index:02d}",
                    "assetId": asset_id,
                    "kind": "embedded-image",
                    "name": (props.attrib.get("name") if props is not None else None) or Path(media_path).name,
                    "slide": slide_number,
                    "objectId": props.attrib.get("id") if props is not None else None,
                    "bbox": normalized_box(picture.find("p:spPr/a:xfrm", NS), slide_width, slide_height),
                    "sourceCrop": crop_box(picture.find("p:blipFill/a:srcRect", NS)),
                    "extraction": "native",
                })

    catalog = {
        "catalogVersion": 1,
        "source": {
            "id": document_id,
            "name": source.name,
            "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "pageCount": len(slide_paths),
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        },
        "assets": list(assets.values()),
        "candidates": candidates,
    }
    (output / "source-catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    shutil.copy2(source, output / source.name)
    print(f"Extracted {len(assets)} unique image(s) across {len(candidates)} occurrence(s) from {len(slide_paths)} slide(s).")


if __name__ == "__main__":
    main()
