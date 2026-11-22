import build


def test_data_files_load():
    assert build.load("site")["name"]
    assert build.load("cv")["experience"]


def test_projects_are_valid():
    for p in build.load("projects"):
        for key in ("slug", "title", "summary", "description", "tags", "date", "interactive"):
            assert key in p, f"{p.get('slug')} missing {key}"
        if p["interactive"]:
            assert (build.ROOT / "notebooks" / f"{p['slug']}.py").exists()


def test_build_without_notebooks():
    build.build(skip_notebooks=True)
    for page in ("index.html", "cv/index.html", "projects/index.html", ".nojekyll"):
        assert (build.DIST / page).exists()
