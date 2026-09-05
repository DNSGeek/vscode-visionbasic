"""Generate syntaxes/visionbasic.tmLanguage.json from the plugin database."""

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


OUT = REPO + "/syntaxes/visionbasic.tmLanguage.json"

SCOPES = {
    "assembler": "keyword.control.assembler.visionbasic",
    "editor": "keyword.control.editor.visionbasic",
    "conditional": "keyword.control.conditional.visionbasic",
    "loop": "keyword.control.loop.visionbasic",
    "flow": "keyword.control.flow.visionbasic",
    "variable": "storage.type.visionbasic",
    "operator": "keyword.operator.word.visionbasic",
    "math": "support.function.math.visionbasic",
    "string": "support.function.string.visionbasic",
    "graphics": "support.function.graphics.visionbasic",
    "sound": "support.function.sound.visionbasic",
    "screen": "support.function.screen.visionbasic",
    "memory": "support.function.memory.visionbasic",
    "io": "support.function.io.visionbasic",
    "system": "support.function.system.visionbasic",
}

db = vbdb.load()


def alternation(names):
    return "|".join(
        re.escape(vbdb.display(n)) for n in vbdb.sort_for_alternation(names)
    )


def kw_match(names):
    """Whole-keyword match. Longest alternative first so BMPCLR beats BMP."""
    return "(?i)\\b(?:%s)(?![A-Za-z0-9$#])" % alternation(names)


repo = {}
patterns = []

# ── Structure ────────────────────────────────────────────────────────────────
repo["line_number"] = {
    "name": "constant.numeric.line-number.visionbasic",
    "match": "^\\s*\\d+(?=\\s|$)",
}
repo["rem_comment"] = {
    "name": "comment.line.rem.visionbasic",
    "begin": "(?i)\\bREM\\b",
    "end": "$",
    "beginCaptures": {"0": {"name": "keyword.control.rem.visionbasic"}},
    "patterns": [{"include": "#todo"}],
}
repo["todo"] = {
    "name": "keyword.other.todo.visionbasic",
    "match": "(?i)\\b(TODO|FIXME|NOTE|XXX|HACK)\\b",
}

# ── Assembler ────────────────────────────────────────────────────────────────
repo["asm_block"] = {
    "name": "meta.embedded.block.assembly.visionbasic",
    "begin": "\\[",
    "end": "\\]|$",
    "beginCaptures": {"0": {"name": "punctuation.section.assembly.begin.visionbasic"}},
    "endCaptures": {"0": {"name": "punctuation.section.assembly.end.visionbasic"}},
    "patterns": [
        {"include": "#asm_comment"},
        {"include": "#asm_mnemonic"},
        {"include": "#asm_immediate"},
        {"include": "#hex_number"},
        {"include": "#binary_number"},
        {"include": "#number"},
        {"include": "#asm_register"},
        {"include": "#string"},
    ],
}
repo["asm_comment"] = {"name": "comment.line.semicolon.visionbasic", "match": ";.*$"}
repo["asm_mnemonic"] = {
    "name": "keyword.operator.mnemonic.visionbasic",
    "match": "(?i)\\b(?:%s)\\b" % "|".join(sorted(db["mnemonics"])),
}
repo["asm_immediate"] = {
    "name": "keyword.operator.immediate.visionbasic",
    "match": "#",
}
repo["asm_register"] = {
    "name": "variable.language.register.visionbasic",
    "match": "(?i)(?<=,)\\s*[AXY]\\b",
}

# ── Literals ─────────────────────────────────────────────────────────────────
repo["string"] = {
    "name": "string.quoted.double.visionbasic",
    "begin": '"',
    "end": '"|$',
    "beginCaptures": {"0": {"name": "punctuation.definition.string.begin.visionbasic"}},
    "endCaptures": {"0": {"name": "punctuation.definition.string.end.visionbasic"}},
    "patterns": [{"include": "#petscii_escape"}],
}
repo["petscii_escape"] = {
    "name": "constant.character.escape.petscii.visionbasic",
    "match": '\\{[^}"]*\\}',
}
repo["hex_number"] = {
    "name": "constant.numeric.hex.visionbasic",
    "match": "\\$[0-9A-Fa-f]+",
}
repo["binary_number"] = {
    "name": "constant.numeric.binary.visionbasic",
    "match": "%[01]+",
}
repo["number"] = {
    "name": "constant.numeric.decimal.visionbasic",
    "match": "\\b\\d+(?:\\.\\d+)?\\b",
}
repo["pi_constant"] = {"name": "constant.language.pi.visionbasic", "match": "\u03c0"}

# ── Definitions & references (before generic keywords) ───────────────────────
repo["label_definition"] = {
    "match": "(?i)\\b(DESC)\\s+(\\d+)\\s*,\\s*([A-Za-z][A-Za-z0-9!@#%&?]*)",
    "captures": {
        "1": {"name": "keyword.control.editor.visionbasic"},
        "2": {"name": "constant.numeric.line-number.visionbasic"},
        "3": {"name": "entity.name.function.visionbasic"},
    },
}
repo["tag_definition"] = {
    "match": "(?i)\\b(TAG|LABEL|PROC)\\s+([A-Za-z][A-Za-z0-9!@#%&?]*)",
    "captures": {
        "1": {"name": "storage.type.visionbasic"},
        "2": {"name": "entity.name.function.visionbasic"},
    },
}
repo["proc_call"] = {
    "match": '(?i)(?<![A-Za-z0-9$#.])([A-Za-z][A-Za-z0-9!@#%&?]*)(\\.)(?=[A-Za-z0-9"$])',
    "captures": {
        "1": {"name": "entity.name.function.call.visionbasic"},
        "2": {"name": "punctuation.separator.parameter.visionbasic"},
    },
}
repo["line_reference"] = {
    "match": "(?i)\\b(GOTO|GOSUB|THEN|ELSE)\\s+(\\d+)",
    "captures": {
        "1": {"name": "keyword.control.flow.visionbasic"},
        "2": {"name": "constant.numeric.line-number.reference.visionbasic"},
    },
}

# ── Keyword groups ───────────────────────────────────────────────────────────
multiword = [k["keyword"] for k in db["keywords"] if " " in k["keyword"]]
repo["multiword_keywords"] = {
    "name": "keyword.control.visionbasic",
    "match": "(?i)\\b(?:%s)\\b"
    % "|".join(
        re.escape(n).replace("\\ ", "\\s+")
        for n in vbdb.sort_for_alternation(multiword)
    ),
}

unimplemented = [k["keyword"] for k in db["keywords"] if k.get("unimplemented")]
repo["unimplemented"] = {
    "name": "invalid.deprecated.unimplemented.visionbasic",
    "match": kw_match(unimplemented),
}

group_rules = []
for gid, _label, members in vbdb.groups(db):
    names = [
        k["keyword"]
        for k in members
        if not k.get("unimplemented")
        and not k.get("fragment")
        and " " not in k["keyword"]
    ]
    if not names:
        continue
    rule = "%s_keywords" % gid
    repo[rule] = {"name": SCOPES[gid], "match": kw_match(names)}
    group_rules.append(rule)

# ── Variables & operators ────────────────────────────────────────────────────
repo["string_variable"] = {
    "name": "variable.other.string.visionbasic",
    "match": "(?i)\\b[A-Za-z][A-Za-z0-9!@#%&?]{0,7}\\$",
}
repo["variable"] = {
    "name": "variable.other.visionbasic",
    "match": "(?i)\\b[A-Za-z][A-Za-z0-9!@#%&?]{0,7}\\b",
}
repo["operators"] = {
    "name": "keyword.operator.visionbasic",
    "match": "<>|<=|>=|[+\\-*/<>=^]",
}
repo["statement_separator"] = {
    "name": "punctuation.terminator.statement.visionbasic",
    "match": ":",
}

patterns = (
    [
        {"include": "#line_number"},
        {"include": "#rem_comment"},
        {"include": "#asm_comment"},
        {"include": "#asm_block"},
        {"include": "#string"},
        {"include": "#hex_number"},
        {"include": "#binary_number"},
        {"include": "#multiword_keywords"},
        {"include": "#label_definition"},
        {"include": "#tag_definition"},
        {"include": "#line_reference"},
        {"include": "#unimplemented"},
    ]
    + [{"include": "#%s" % r} for r in group_rules]
    + [
        {"include": "#proc_call"},
        {"include": "#string_variable"},
        {"include": "#pi_constant"},
        {"include": "#number"},
        {"include": "#operators"},
        {"include": "#statement_separator"},
        {"include": "#variable"},
    ]
)

grammar = {
    "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    "information_for_contributors": [
        "Generated from the C64 IDE VisionBASIC %s plugin definition." % db["version"],
        "Do not edit by hand — regenerate instead.",
    ],
    "name": "Vision BASIC",
    "scopeName": "source.visionbasic",
    "fileTypes": ["bas", "vb64", "vbas"],
    "patterns": patterns,
    "repository": repo,
}

write_json(OUT, grammar)
print("wrote", OUT, len(repo), "rules,", len(group_rules), "keyword groups")
