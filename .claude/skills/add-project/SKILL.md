---
name: add-project
description: Add a mini-project to the site (entry in data/projects.yaml, page, optional marimo notebook, test). Use when the user wants to add, create or showcase a new mini-project.
---

# Add a mini-project

The site is static and free-hosted. Read CLAUDE.md first.

1. Ask for anything missing: title, one-line summary, longer description, tags, repo link, date, screenshot(s), and whether it needs to run interactively.
2. Add an entry to `data/projects.yaml`: `slug`, `title`, `summary`, `description`, `tags`, `repo`, `date`, `image`, `interactive` (true/false). Never hard-code project text in templates.
3. Static project: put images in `static/img/projects/<slug>/`; the generic `project.html` template renders the page.
4. Interactive project:
   - write `notebooks/<slug>.py` as a marimo notebook (pure Python, no server, no secrets, no network calls that need keys);
   - `build.py` exports it with `marimo export html-wasm notebooks/<slug>.py -o dist/projects/<slug>/app --mode run`; the project page embeds or links it;
   - keep dependencies Pyodide-compatible (pure Python or packages Pyodide ships); say so to the user if one is not.
5. Add or extend a test in `tests/` (entry has required fields, notebook file exists when `interactive: true`).
6. Run `uv run pytest`, `uv run ruff check .`, build, serve `dist/` and open the project page to confirm it renders and, if interactive, that the notebook loads.
