---
name: update-cv
description: Update the CV on the site (experience, education, skills, languages, downloadable PDF). Use when the user edits or adds CV information.
---

# Update the CV

1. Content lives in `data/cv.yaml` (profile, experience, education, skills, languages, links). Edit that file only; `templates/cv.html` renders it.
2. The CV PDF is **not published**: `data/CV.pdf` is the user's source file, git-ignored, and must never be copied to `static/` or committed (the repo is public). Do not add a `pdf:` key to `cv.yaml`. Use the PDF only as a source for the content.
3. Do not invent experience, dates, skills or numbers. Ask when something is missing.
4. Privacy: the repo and site are public. Never add phone number, home address, photo or names of private individuals (e.g. supervisors). Contact is limited to the personal email, LinkedIn and GitHub.
5. Write in English. Run `uv run pytest`, build, serve `dist/` and check the CV page.
