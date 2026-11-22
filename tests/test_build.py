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
    for page in (
        "index.html",
        "cv/index.html",
        "projects/index.html",
        "concerts/index.html",
        ".nojekyll",
    ):
        assert (build.DIST / page).exists()


def test_concerts_skip_test_and_zero_rows():
    groups = build.load_concerts()
    assert groups
    names = [g["artist"].lower() for g in groups]
    assert not any(n.startswith("test") for n in names)
    assert "stromae" not in names  # 0 concerts


def test_concerts_grouped_by_artist(tmp_path, monkeypatch):
    csv_text = (
        "Artiste,Premiere partie,Nombre d'artistes,Nombre de concert,Commentaire,Date,Lieu,Co\u00fbt,Ville,Salle\n"
        "Gazo,,,3,,01/06/2023,,40,Paris,Accor\n"
        "Vald,,,1,,,,,,\n"
        "gazo ,,,,,2024-06-01,,60 \u20ac,Lyon,Halle\n"
    )
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "concerts.csv").write_text(csv_text, encoding="utf-8")
    monkeypatch.setattr(build, "ROOT", tmp_path)
    vald, gazo = build.load_concerts()  # Gazo's latest row comes after Vald's
    assert gazo["artist"] == "Gazo" and gazo["total"] == 3 and gazo["undocumented"] == 1
    assert [c["date"] for c in gazo["concerts"]] == ["2024-06-01", "2023-06-01"]  # newest first
    assert gazo["concerts"][0]["price"] == 60.0
    assert vald["total"] == 1 and vald["undocumented"] == 0


def test_parse_date_and_price():
    assert build.parse_date("") == ""
    assert build.parse_date("25/12/2024") == "2024-12-25"
    assert build.parse_date("2024-12-25") == "2024-12-25"
    assert build.parse_price("45,50 €") == 45.5
    assert build.parse_price("") is None


def test_admin_config_stores_only_a_hash():
    import re

    import yaml

    cfg = yaml.safe_load((build.ROOT / "data" / "admin.yaml").read_text())
    assert re.fullmatch(r"[0-9a-f]{64}", cfg["hash"])
    assert re.fullmatch(r"[0-9a-f]{32}", cfg["salt"])
    assert cfg["iterations"] >= 100_000
    assert "password" not in cfg


def test_admin_page_is_noindex_and_not_in_nav():
    import yaml

    build.build(skip_notebooks=True)
    html = (build.DIST / "concerts" / "admin" / "index.html").read_text()
    assert "noindex" in html
    nav = yaml.safe_load((build.ROOT / "data" / "site.yaml").read_text())["nav"]
    assert all("admin" not in item["path"] for item in nav)


def test_set_admin_password_hash_matches_algorithm():
    import hashlib
    import sys

    sys.path.insert(0, str(build.ROOT / "scripts"))
    import set_admin_password as sap

    salt = bytes.fromhex("00" * 16)
    expected = hashlib.pbkdf2_hmac("sha256", b"x", salt, 1000, dklen=32).hex()
    assert sap.hash_password("x", salt, 1000) == expected


def test_playlist_data_is_valid():
    import json

    data = json.loads((build.ROOT / "data" / "playlist.json").read_text(encoding="utf-8"))
    assert data["tracks"]
    assert all({"id", "title", "artist"} <= set(t) for t in data["tracks"])
    build.build(skip_notebooks=True)
    html = (build.DIST / "index.html").read_text(encoding="utf-8")
    assert "music-frame" in html and "autoplay" not in html.replace("no autoplay", "")


def test_contact_page_hides_form_until_configured(monkeypatch):
    import yaml

    site = yaml.safe_load((build.ROOT / "data" / "site.yaml").read_text())
    build.build(skip_notebooks=True)
    html = (build.DIST / "contact" / "index.html").read_text(encoding="utf-8")
    assert "linkedin.com" in html  # always reachable
    assert ("contact-form" in html) == bool(site["contact"]["formspree_id"])
    assert "Contact me" in (build.DIST / "index.html").read_text(encoding="utf-8")


def test_theme_toggle_on_every_page():
    build.build(skip_notebooks=True)
    for page in ("index.html", "cv/index.html", "concerts/index.html", "contact/index.html"):
        html = (build.DIST / page).read_text(encoding="utf-8")
        assert 'id="theme-toggle"' in html and "/js/theme.js" in html, page
    assert (build.DIST / "js" / "theme.js").exists()


def test_festival_ticket_is_counted_once(tmp_path, monkeypatch):
    csv_text = (
        "Artiste,Premiere partie,Nombre d'artistes,Nombre de concert,Commentaire,Date,Lieu,Co\u00fbt,Ville,Salle,Festival\n"
        "Orelsan,,,1,,2024-06-20,,200,Clisson,,Hellfest\n"
        "Gazo,,,1,,2024-06-21,,,Clisson,,hellfest\n"
        "Vald,,,1,,2024-06-22,,200,Clisson,,Hellfest\n"
        "Josman,,,1,,2023-06-20,,180,Clisson,,Hellfest\n"
        "Dinos,,,1,,2024-09-01,,35,Paris,Olympia,\n"
    )
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "concerts.csv").write_text(csv_text, encoding="utf-8")
    monkeypatch.setattr(build, "ROOT", tmp_path)
    by_artist = {g["artist"]: g["concerts"][0] for g in build.load_concerts()}
    assert by_artist["Orelsan"]["counts"] and not by_artist["Orelsan"]["shared"]
    assert (
        not by_artist["Gazo"]["counts"] and by_artist["Gazo"]["shared"]
    )  # no price, covered by Orelsan's
    assert (
        not by_artist["Vald"]["counts"] and by_artist["Vald"]["shared"]
    )  # price repeated: ignored
    assert by_artist["Josman"]["counts"]  # same festival, other year: its own ticket
    assert by_artist["Dinos"]["counts"] and not by_artist["Dinos"]["shared"]  # normal concert
    total = sum(c["price"] for c in by_artist.values() if c["counts"])
    assert total == 200 + 180 + 35
