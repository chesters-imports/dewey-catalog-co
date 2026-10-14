#!/usr/bin/env python3
"""TINY notes (cat-o-roms sticky drawer) → The Deck Host"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

PROD = Path(__file__).resolve().parent
CAT_SYS = PROD / "cat_sys"
DECK_HOST_PY = PROD.parents[2] / "the-deck-host" / "shell" / "deck_host.py"

PORT = os.environ.get("TINYNOTES_PORT", "43130")
URL = os.environ.get("TINYNOTES_URL", f"http://127.0.0.1:{PORT}/")
HEALTH = os.environ.get("TINYNOTES_HEALTH", f"http://127.0.0.1:{PORT}/")


def main() -> int:
    if not CAT_SYS.is_dir():
        print(f"cat_sys missing: {CAT_SYS}", file=sys.stderr)
        return 1
    if not DECK_HOST_PY.is_file():
        print(f"Deck Host not found: {DECK_HOST_PY}", file=sys.stderr)
        return 1

    profile = os.environ.get("DECK_HOST_PROFILE", "desk").strip() or "desk"
    width = os.environ.get("TINYNOTES_WIDTH", "800")
    height = os.environ.get("TINYNOTES_HEIGHT", "600")
    # Bind all interfaces so it is on the LAN, not only loopback.
    server_cmd = f"{sys.executable} -m http.server {PORT} --bind 0.0.0.0 --directory cat_sys"
    cmd = [
        sys.executable,
        str(DECK_HOST_PY),
        "--title",
        "TINY notes",
        "--profile",
        profile,
        "--width",
        width,
        "--height",
        height,
        "--url",
        URL,
        "--health",
        HEALTH,
        "--health-timeout",
        "20",
        "--spawn",
        server_cmd,
        "--spawn-cwd",
        str(PROD),
    ]
    print("TINY notes · cat-o-roms sticky drawer · The Deck Host")
    print(" ".join(cmd))
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
