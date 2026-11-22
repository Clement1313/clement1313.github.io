---
name: build-and-deploy
description: Build the static site into dist/, preview it locally, and set up or debug the free GitHub Pages deployment with GitHub Actions. Use for build, publish or deployment problems.
---

# Build and deploy (free, GitHub Pages)

## Build and preview
- `uv run python build.py` regenerates `dist/` from scratch (clean it first so deleted pages disappear).
- Preview with `uv run python -m http.server -d dist`; never `file://`.
- `build.py` must: render all templates, copy `static/` to `dist/`, export interactive notebooks with `marimo export html-wasm`, and write `dist/.nojekyll`.

## Deployment: `.github/workflows/deploy.yml`
- Trigger: push to `main` (plus `workflow_dispatch`).
- Steps: checkout, `astral-sh/setup-uv`, `uv sync`, `uv run ruff check .`, `uv run pytest`, `uv run python build.py`, `actions/configure-pages`, `actions/upload-pages-artifact` (path `dist`), then a deploy job with `actions/deploy-pages`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`; environment `github-pages`.
- Tell the user to enable Settings -> Pages -> Source: GitHub Actions. For the root URL the repo must be named `<user>.github.io`; otherwise the site lives under `/<repo>/` and `base_url` in `data/site.yaml` must be set accordingly.
- Public repos get free Pages and free Actions minutes; stay within that.

## Debugging checklist
Broken CSS/links online but fine locally -> wrong `base_url`. Folders starting with `_` missing -> `.nojekyll` absent. Notebook blank -> check browser console (Pyodide-incompatible dependency or opened via `file://`). Never claim the live site works without having seen the result.
