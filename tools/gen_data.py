"""Emit the shared keyword database consumed by both editor plugins."""

import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import vbdb


def write_json(path, data):
    """Write JSON, then hand it to Prettier so regenerating never churns the
    formatting the repository's CI enforces. Prettier being absent is fine."""
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")
    # npx prefers a locally installed Prettier and falls back to fetching one
    # into its own cache, so this needs no dependency in package.json.
    try:
        subprocess.run(
            ["npx", "--yes", "prettier@3", "--write", path],
            check=True,
            cwd=REPO,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=120,
        )
    except (OSError, subprocess.SubprocessError):
        print("note: Prettier unavailable; CI will reformat %s" % path)


OUT = REPO + "/data/visionbasic.json"

db = vbdb.load()

keywords = []
for k in db["keywords"]:
    entry = {
        "keyword": k["keyword"],
        "group": k["group"],
        "type": k["type"],
        "category": k["category"],
        "syntax": k.get("syntax", k["keyword"]),
        "description": k.get("description", ""),
    }
    for opt in ("example", "notes", "parameters", "warning", "tokens"):
        if k.get(opt):
            entry[opt] = k[opt]
    for flag in (
        "composite",
        "fragment",
        "unimplemented",
        "mathWarning",
        "varNote",
        "mlSafe",
    ):
        if k.get(flag):
            entry[flag] = True
    if "token" in k:
        entry["token"] = k["token"]
    if "prefix" in k:
        entry["prefix"] = k["prefix"]
    keywords.append(entry)

out = {
    "$comment": (
        "Generated from the C64 IDE VisionBASIC %s plugin (token table from "
        "VISION BASIC.VEX $AC31, docs from the Vision BASIC Cheat Sheet). "
        "Edit the generator, not this file." % db["version"]
    ),
    "language": db["name"],
    "version": db["version"],
    "url": db["url"],
    "activationSYS": db["activationSYS"],
    "groups": {gid: label for gid, label, _ in vbdb.groups(db)},
    "notes": db["notes"],
    "mlSafe": db["mlSafe"],
    "mnemonics": db["mnemonics"],
    "keywords": keywords,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
write_json(OUT, out)
print("wrote", OUT, len(keywords), "keywords")
