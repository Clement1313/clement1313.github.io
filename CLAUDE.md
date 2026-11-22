# Personal website (static, Python-built)

Personal site: intro, CV, mini-projects, anything else I like. Hosted for free on GitHub Pages at `https://<user>.github.io`. **Everything must stay free** (no paid hosting, no paid domain, no paid services).

Site language: **English** for now. Keep all text in `data/` and templates so a second language can be added later.

## How it works
A Python script (`build.py`) reads content from `data/*.yaml`, renders Jinja2 templates from `templates/`, and writes plain HTML into `dist/`. GitHub Actions runs the build on every push to `main` and publishes `dist/` to GitHub Pages. There is no server in production.

Interactive mini-projects are written as **marimo** notebooks (`notebooks/<slug>.py`) and exported to WebAssembly (`marimo export html-wasm`), so Python runs in the visitor's browser. Static projects are just a description, screenshots and a repo link.

## Stack
- Python 3.12+ (local: 3.14), dependencies managed with `uv` (`pyproject.toml`)
- `jinja2` + `pyyaml` for the build; plain CSS (no framework needed), no JS build step
- `marimo` for interactive projects; `plotly` for charts (exported as HTML)
- `pytest`, `ruff`

## Layout
```
build.py            # entry point: data/ + templates/ -> dist/
data/               # site.yaml, cv.yaml, projects.yaml, concerts.csv (all content lives here)
templates/          # base.html, home.html, cv.html, projects.html, project.html
static/             # css/, js/ (concerts.js), img/ (copied as-is to dist/; never put the CV PDF here)
notebooks/          # one marimo notebook per interactive project
tests/
.github/workflows/deploy.yml
dist/               # generated, git-ignored
```

## Commands
- Install: `uv sync`
- Build: `uv run python build.py`
- Preview: `uv run python -m http.server -d dist` then open http://localhost:8000 (do not open files via `file://`, the WASM notebooks need HTTP)
- Edit a notebook: `uv run marimo edit notebooks/<slug>.py`
- Tests / lint: `uv run pytest`, `uv run ruff check . && uv run ruff format .`

## Conventions
- Code, identifiers and site text in English.
- Content goes in `data/*.yaml`, never hard-coded in templates or `build.py`.
- Every page needs `<title>`, meta description and Open Graph tags (set from data).
- Plain, responsive CSS with light/dark support via `prefers-color-scheme`; semantic HTML, alt text on images, readable contrast, keyboard navigation.
- Links must work under the site root; use the `base_url` from `site.yaml` rather than hard-coded absolute paths.
- Load heavy assets (Plotly, marimo/WASM) only on the pages that use them.
- No secrets, no unpublished drafts and no private data in the repo (it is public). Only put public contact info in the CV.
- Everything free: before adding a service, library or hosted tool, check it has a free tier that fits and say so.

## Workflow
- `main` is always deployable; one branch per feature or mini-project.
- Short present-tense commit messages.
- Before saying a page works: build it, serve `dist/` locally and check it renders with no console errors and no broken links.

## Project skills
- `add-project`: add a mini-project (static or interactive marimo)
- `update-cv`: edit CV content and PDF
- `build-and-deploy`: build, preview and GitHub Pages deployment
