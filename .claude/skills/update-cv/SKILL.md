---
name: update-cv
description: Update the CV on the site (experience, education, skills, languages, downloadable PDF). Use when the user edits or adds CV information.
---

# Update the CV

1. Content lives in `data/cv.yaml` (profile, experience, education, skills, languages, links). Edit that file only; `templates/cv.html` renders it.
2. The downloadable PDF is `static/cv.pdf`, linked with a plain `<a href download>`. Replace it only if the user provides a new one; do not generate one unprompted.
3. Do not invent experience, dates, skills or numbers. Ask when something is missing.
4. Privacy: the repo and site are public. Do not add phone number or home address unless the user explicitly asks; prefer a public email, LinkedIn or GitHub link.
5. Write in English. Run `uv run pytest`, build, serve `dist/` and check the CV page.
