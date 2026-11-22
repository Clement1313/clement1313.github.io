"""Set the password of /concerts/admin/. Only a salted PBKDF2 hash is stored (data/admin.yaml).

Usage: uv run python scripts/set_admin_password.py   (prompts for the password)
"""

import getpass
import hashlib
import secrets
import sys
from pathlib import Path

import yaml

TARGET = Path(__file__).parent.parent / "data" / "admin.yaml"
ITERATIONS = 600_000
DEFAULTS = {
    "repo": "Clement1313/clement1313.github.io",
    "branch": "main",
    "path": "data/concerts.csv",
}


def hash_password(password: str, salt: bytes, iterations: int = ITERATIONS) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations, dklen=32).hex()


def main() -> None:
    password = (
        getpass.getpass("New admin password: ")
        if sys.stdin.isatty()
        else sys.stdin.readline().rstrip("\n")
    )
    if not password:
        sys.exit("Empty password, nothing written.")
    config = {**DEFAULTS, **(yaml.safe_load(TARGET.read_text()) if TARGET.exists() else {})}
    salt = secrets.token_bytes(16)
    config.update(salt=salt.hex(), iterations=ITERATIONS, hash=hash_password(password, salt))
    TARGET.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    print(f"Wrote {TARGET}")


if __name__ == "__main__":
    main()
