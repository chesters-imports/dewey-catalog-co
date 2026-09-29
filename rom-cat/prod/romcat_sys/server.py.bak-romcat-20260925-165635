#!/usr/bin/env python3
"""
ROM Cat Â· CO.DCC-001-ROMCAT
Catalog of producers and their ROM SKUs.
Built from DCO REQ. Library card energy. Not a sticky board.
"""

from __future__ import annotations

import os
import json
import re
import secrets
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "catalog.json"
HOST = os.environ.get("ROMCAT_HOST", "0.0.0.0")
PORT = int(os.environ.get("ROMCAT_PORT", "43132"))


def load_catalog() -> dict[str, Any]:
    if not DATA.is_file():
        return {
            "schema": "rom-cat.v1",
            "house": "CO.DCC",
            "sku": "CO.DCC-001-ROMCAT",
            "title": "ROM Cat",
            "whisper": "empty drawer",
            "producers": [],
            "roms": [],
        }
    return json.loads(DATA.read_text(encoding="utf-8"))


def save_catalog(doc: dict[str, Any]) -> None:
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def slug_id(text: str) -> str:
    words = re.findall(r"[a-zA-Z0-9]+", (text or "").lower())
    base = "-".join(words[:5]) if words else "item"
    return f"{base}-{secrets.token_hex(2)}"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code: int, obj: Any) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict[str, Any]:
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0:
            return {}
        body = self.rfile.read(n)
        return json.loads(body.decode("utf-8"))

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(200, {"ok": True, "sku": "CO.DCC-001-ROMCAT", "service": "rom-cat"})
            return
        if path == "/api/catalog":
            self._json(200, load_catalog())
            return
        if path in ("/", ""):
            self.path = "/index.html"
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self._read_json()
        except Exception as e:
            self._json(400, {"ok": False, "error": str(e)})
            return

        doc = load_catalog()
        producers: list[dict[str, Any]] = list(doc.get("producers") or [])
        roms: list[dict[str, Any]] = list(doc.get("roms") or [])

        if path == "/api/producer":
            action = (payload.get("action") or "upsert").lower()
            if action == "delete":
                pid = payload.get("id") or ""
                producers = [p for p in producers if p.get("id") != pid]
                roms = [r for r in roms if r.get("producer_id") != pid]
                doc["producers"] = producers
                doc["roms"] = roms
                save_catalog(doc)
                self._json(200, {"ok": True, "catalog": doc})
                return

            pid = (payload.get("id") or "").strip()
            name = (payload.get("name") or "").strip()
            if not name and not pid:
                self._json(400, {"ok": False, "error": "name required"})
                return
            if not pid:
                pid = slug_id(name)
            row = {
                "id": pid,
                "name": name or pid,
                "chip_code": (payload.get("chip_code") or "").strip(),
                "mission": (payload.get("mission") or "").strip(),
                "hands_ven": (payload.get("hands_ven") or "").strip(),
                "notes": (payload.get("notes") or "").strip(),
                "address": (payload.get("address") or "").strip(),
            }
            found = False
            for i, p in enumerate(producers):
                if p.get("id") == pid:
                    producers[i] = {**p, **row}
                    found = True
                    break
            if not found:
                producers.append(row)
            doc["producers"] = producers
            save_catalog(doc)
            self._json(200, {"ok": True, "catalog": doc, "id": pid})
            return

        if path == "/api/rom":
            action = (payload.get("action") or "upsert").lower()
            if action == "delete":
                rid = payload.get("id") or ""
                roms = [r for r in roms if r.get("id") != rid]
                doc["roms"] = roms
                save_catalog(doc)
                self._json(200, {"ok": True, "catalog": doc})
                return

            rid = (payload.get("id") or "").strip()
            name = (payload.get("name") or "").strip()
            producer_id = (payload.get("producer_id") or "").strip()
            if not producer_id:
                self._json(400, {"ok": False, "error": "producer_id required"})
                return
            if not name and not rid:
                self._json(400, {"ok": False, "error": "name required"})
                return
            if not rid:
                rid = slug_id(name)
            status = (payload.get("status") or "idea").strip().lower()
            if status not in ("idea", "desk", "shipped", "mausoleum", "broken"):
                status = "idea"
            launcher_show = payload.get("launcher_show")
            if isinstance(launcher_show, str):
                launcher_show = launcher_show.lower() in ("1", "true", "yes", "on")
            elif launcher_show is None:
                launcher_show = None
            else:
                launcher_show = bool(launcher_show)
            row = {
                "id": rid,
                "producer_id": producer_id,
                "name": name or rid,
                "chip_code": (payload.get("chip_code") or "").strip(),
                "description": (payload.get("description") or "").strip(),
                "status": status,
                "address": (payload.get("address") or "").strip(),
                "notes": (payload.get("notes") or "").strip(),
            }
            if launcher_show is not None:
                row["launcher_show"] = launcher_show
            # Logo plate CSS (launcher cart sticker). Only touch when client sends it
            # so hide/show toggle does not wipe custom plates.
            if "plate_css" in payload:
                pc = str(payload.get("plate_css") or "").strip()
                # light guard â€” declarations only, desk-local
                low = pc.lower()
                if any(
                    b in low
                    for b in ("</", "<script", "expression(", "javascript:")
                ):
                    pc = ""
                if len(pc) > 4000:
                    pc = pc[:4000]
                row["plate_css"] = pc
            # Case shell: classicboi | julie (+ julie_tint presets)
            if "case_shell" in payload:
                shell = str(payload.get("case_shell") or "classicboi").strip().lower()
                if shell not in ("classicboi", "julie"):
                    shell = "classicboi"
                row["case_shell"] = shell
            if "julie_tint" in payload:
                tint = str(payload.get("julie_tint") or "red").strip()
                # preset id OR #rgb/#rrggbb/#rrggbbaa (hands custom intense plastics)
                _presets = {
                    "red",
                    "crimson",
                    "pink",
                    "purple",
                    "mint",
                    "clear",
                    "blue",
                    "amber",
                    "smoke",
                }
                low = tint.lower()
                if low in _presets:
                    tint = low
                elif low.startswith("#") and len(low) in (4, 7, 9) and all(
                    c in "0123456789abcdef#" for c in low
                ):
                    tint = low
                else:
                    tint = "red"
                row["julie_tint"] = tint
            found = False
            for i, r in enumerate(roms):
                if r.get("id") == rid:
                    merged = {**r, **row}
                    if launcher_show is None and "launcher_show" in r:
                        merged["launcher_show"] = r["launcher_show"]
                    # empty string clears plate customization
                    if row.get("plate_css") == "":
                        merged.pop("plate_css", None)
                    roms[i] = merged
                    found = True
                    break
            if not found:
                if launcher_show is None:
                    row["launcher_show"] = status in ("desk", "shipped") and bool(
                        row.get("address")
                    )
                if row.get("plate_css") == "":
                    row.pop("plate_css", None)
                if "case_shell" not in row:
                    row["case_shell"] = "classicboi"
                if "julie_tint" not in row:
                    row["julie_tint"] = "red"
                roms.append(row)
            doc["roms"] = roms
            save_catalog(doc)
            self._json(200, {"ok": True, "catalog": doc, "id": rid})
            return

        self._json(404, {"ok": False, "error": "unknown api"})


def main() -> None:
    if not DATA.is_file():
        save_catalog(load_catalog())
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ROM Cat  http://{HOST}:{PORT}/")
    print(f"SKU CO.DCC-001-ROMCAT Â· drawer {DATA}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nclosed the drawer")


if __name__ == "__main__":
    main()
