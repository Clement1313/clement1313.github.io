"""Refresh data/playlist.json from the public Deezer API (no key needed).

The browser can't call the Deezer API directly (no CORS), so the track list is fetched here, at
build time, and the random pick happens in the visitor's browser. If the fetch fails, the
previously committed data/playlist.json is kept.

Usage: uv run python scripts/fetch_playlist.py
"""

import json
import sys
import urllib.request
from pathlib import Path

PLAYLIST_ID = 15027720763
TARGET = Path(__file__).parent.parent / "data" / "playlist.json"


def get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=15) as response:
        return json.load(response)


def fetch(playlist_id: int) -> dict:
    meta = get(f"https://api.deezer.com/playlist/{playlist_id}")
    if "error" in meta:
        raise RuntimeError(meta["error"])
    tracks, url = [], f"https://api.deezer.com/playlist/{playlist_id}/tracks?limit=100"
    while url:
        page = get(url)
        tracks += [
            {"id": t["id"], "title": t["title"], "artist": t["artist"]["name"]}
            for t in page["data"]
            if t.get("readable", True)
        ]
        url = page.get("next")
    return {
        "id": playlist_id,
        "title": meta["title"],
        "url": meta["link"].split("?")[0],
        "tracks": tracks,
    }


if __name__ == "__main__":
    try:
        data = fetch(PLAYLIST_ID)
    except (
        OSError,
        ValueError,
        KeyError,
        RuntimeError,
    ) as exc:  # network down, API change, private playlist
        print(f"Could not refresh the playlist ({exc}); keeping {TARGET.name}.", file=sys.stderr)
        sys.exit(0 if TARGET.exists() else 1)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['tracks'])} tracks to {TARGET}")
