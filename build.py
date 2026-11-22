"""Build the static site: data/*.yaml + templates/ + static/ -> dist/."""

import argparse
import csv
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).parent
DIST = ROOT / "dist"


def load(name: str):
    return yaml.safe_load((ROOT / "data" / f"{name}.yaml").read_text(encoding="utf-8"))


DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y")


def parse_date(raw: str) -> str:
    """Return an ISO date (YYYY-MM-DD) or "" if empty. Fail loudly on unknown formats."""
    raw = raw.strip()
    if not raw:
        return ""
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Unrecognised date {raw!r} in concerts.csv (use YYYY-MM-DD or DD/MM/YYYY)")


def parse_price(raw: str) -> float | None:
    raw = re.sub(r"[^\d,.]", "", raw).replace(",", ".")
    return float(raw) if raw else None


def load_concerts() -> list[dict]:
    """Concerts grouped by artist, ordered by each artist's most recent row in data/concerts.csv.

    The CSV has one row per concert and is chronological (last row = most recent). Rows sharing an
    artist name are grouped. "Nombre de concert" is the total number of shows for the artist (use
    the highest value); concerts with no row of their own are reported as "undocumented".
    Skips test rows and rows whose count is explicitly 0.
    """
    with (ROOT / "data" / "concerts.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    groups: dict[str, dict] = {}
    for index, row in enumerate(rows):
        artist = (row.get("Artiste") or "").strip()
        raw_count = (row.get("Nombre de concert") or "").strip()
        if not artist or artist.lower().startswith("test") or raw_count == "0":
            continue
        group = groups.setdefault(
            artist.casefold(), {"artist": artist, "declared": 0, "concerts": [], "order": 0}
        )
        group["declared"] = max(group["declared"], int(raw_count or 1))
        group["order"] = index
        group["concerts"].append(
            {
                "date": parse_date(row.get("Date") or ""),
                "venue": (row.get("Salle") or "").strip(),
                "city": (row.get("Ville") or "").strip(),
                "price": parse_price(row.get("Co\u00fbt") or ""),
            }
        )
    result = []
    for group in sorted(groups.values(), key=lambda g: g["order"]):
        concerts = group["concerts"][::-1]  # newest first
        total = max(group["declared"], len(concerts))
        result.append(
            {
                "artist": group["artist"],
                "order": group["order"],
                "total": total,
                "undocumented": total - len(concerts),
                "concerts": concerts,
            }
        )
    return result


def write(env: Environment, template: str, out: str, **ctx) -> None:
    path = DIST / out
    path.parent.mkdir(parents=True, exist_ok=True)
    current = "/" + out.removesuffix("index.html")
    path.write_text(
        env.get_template(template).render(current_path=current, **ctx), encoding="utf-8"
    )


def export_notebook(slug: str) -> None:
    out = DIST / "projects" / slug / "app"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "marimo",
            "export",
            "html-wasm",
            str(ROOT / "notebooks" / f"{slug}.py"),
            "-o",
            str(out),
            "--mode",
            "run",
            "--no-show-code",
        ],
        check=True,
    )


def build(skip_notebooks: bool = False) -> None:
    site, cv, projects = load("site"), load("cv"), load("projects")
    site["base_url"] = site.get("base_url", "").rstrip("/")
    projects = sorted(projects, key=lambda p: str(p["date"]), reverse=True)

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    if (ROOT / "static").exists():
        shutil.copytree(ROOT / "static", DIST, dirs_exist_ok=True)
    (DIST / ".nojekyll").touch()

    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=select_autoescape(["html"]),
    )
    ctx = {"site": site}
    write(env, "home.html", "index.html", **ctx, page_title=site["name"])
    write(env, "cv.html", "cv/index.html", **ctx, cv=cv, page_title="CV")
    write(
        env, "projects.html", "projects/index.html", **ctx, projects=projects, page_title="Projects"
    )
    write(
        env,
        "concerts.html",
        "concerts/index.html",
        **ctx,
        concerts=load_concerts(),
        page_title="Concerts",
        page_description="Interactive stats about the concerts I have been to.",
    )
    admin_file = ROOT / "data" / "admin.yaml"
    if admin_file.exists():
        write(
            env,
            "admin.html",
            "concerts/admin/index.html",
            **ctx,
            admin=yaml.safe_load(admin_file.read_text(encoding="utf-8")),
            page_title="Concerts admin",
        )
    for project in projects:
        write(
            env,
            "project.html",
            f"projects/{project['slug']}/index.html",
            **ctx,
            project=project,
            page_title=project["title"],
        )
        if project.get("interactive") and not skip_notebooks:
            export_notebook(project["slug"])
    print(f"Built {DIST}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-notebooks", action="store_true", help="skip marimo WASM export")
    build(parser.parse_args().skip_notebooks)
