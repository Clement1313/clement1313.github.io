"""Build the static site: data/*.yaml + templates/ + static/ -> dist/."""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).parent
DIST = ROOT / "dist"


def load(name: str):
    return yaml.safe_load((ROOT / "data" / f"{name}.yaml").read_text(encoding="utf-8"))


def write(env: Environment, template: str, out: str, **ctx) -> None:
    path = DIST / out
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(env.get_template(template).render(**ctx), encoding="utf-8")


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
    write(env, "home.html", "index.html", **ctx, projects=projects[:3], page_title=site["name"])
    write(env, "cv.html", "cv/index.html", **ctx, cv=cv, page_title="CV")
    write(
        env, "projects.html", "projects/index.html", **ctx, projects=projects, page_title="Projects"
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
