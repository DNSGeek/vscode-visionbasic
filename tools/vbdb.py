"""Normalise the C64 IDE VisionBASIC plugin into a keyword database."""

import json
import os
import re
import sys

# The C64 IDE plugin definition these files are generated from. Override with
# --plugin PATH, the VISIONBASIC_PLUGIN environment variable, or by editing
# DEFAULT_SRC below.
DEFAULT_SRC = (
    "~/Source/git/C64IDE-OpenSource/Resources/Plugins/VisionBASIC_1.1.c64basic"
)


def source_path(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if "--plugin" in argv:
        path = argv[argv.index("--plugin") + 1]
    else:
        path = os.environ.get("VISIONBASIC_PLUGIN", DEFAULT_SRC)
    path = os.path.expanduser(path)
    if not os.path.exists(path):
        raise SystemExit(
            "Vision BASIC plugin definition not found: %s\n"
            "Pass --plugin PATH or set VISIONBASIC_PLUGIN." % path
        )
    return path


UNIMPLEMENTED_MARK = "Not available in Vision BASIC."

# TextMate-ish scope buckets. Keyed by (category, type); falls back to category.
SCOPE_GROUPS = [
    # (group id, human label, predicate)
    ("assembler", "Assembler mode", lambda k: k["category"] == "assembly"),
    ("editor", "Editor & compiler", lambda k: k["category"] == "editor"),
    ("conditional", "Conditionals", lambda k: k["type"] == "conditional"),
    ("loop", "Loops", lambda k: k["category"] == "loop"),
    ("flow", "Program flow", lambda k: k["category"] == "flow"),
    ("variable", "Variables & types", lambda k: k["category"] == "variables"),
    ("operator", "Word operators", lambda k: k["type"] == "operator"),
    ("math", "Math", lambda k: k["category"] == "math"),
    ("string", "Strings", lambda k: k["category"] == "string"),
    ("graphics", "Bitmap & sprites", lambda k: k["category"] == "graphics"),
    ("sound", "SID sound", lambda k: k["category"] == "sound"),
    ("screen", "Text screen", lambda k: k["category"] == "screen"),
    ("memory", "Memory & expansion RAM", lambda k: k["category"] == "memory"),
    ("io", "Disk, files & input", lambda k: k["category"] == "io"),
    ("system", "System & interrupts", lambda k: k["category"] == "system"),
]

# Keywords that are token-table building blocks only; they are always seen as
# part of a composite (BMPCLR, REUPEEK, LONGPOKE ...), never on their own.
TOKEN_FRAGMENTS = {"BMP", "REU", "LONG"}

MATH_WARNING = (
    "Parentheses are NOT allowed in math expressions and there is no operator "
    "precedence: expressions evaluate strictly left to right. "
    "`4+3*5-2*6` is `(((4+3)*5)-2)*6` = 198."
)
VAR_NOTE = (
    "Variable names start with a letter, are significant to 8 characters, and may "
    "contain `!@#%&?` and digits. A name may contain a keyword but may not start "
    "with one. String variables end in `$`. Variables are integers unless declared "
    "`DECIMAL`."
)
ML_SAFE = [
    "START",
    "GOTO",
    "GOSUB",
    "RETURN",
    "REM",
    "TAG",
    "PROC",
    "MODULE",
    "LOCAL",
    "GLOBAL",
    "ADD",
    "SUBTRACT",
    "COMPARE",
    "HALF",
    "DOUBLE",
    "VARIABLES",
    "HALT",
    "RESUME",
    "VERSION",
    "DEBUG",
    "STARTINT",
    "RASTER",
    "BYTES",
    "STRINGS",
]

MATH_KEYWORDS = {
    "ABS",
    "INT",
    "SGN",
    "WHOLE",
    "FRAC",
    "RND",
    "RANDOM",
    "ADD",
    "SUBTRACT",
    "COMPARE",
    "INC",
    "DEC",
    "DOUBLE",
    "HALF",
    "LET",
    "IF",
    "THEN",
    "ELSE",
}
VAR_KEYWORDS = {
    "DIM",
    "DECIMAL",
    "TAG",
    "LABEL",
    "VARIABLES",
    "DEF",
    "INTEGER",
    "DUBL",
    "SUB",
}

EXTRA_NOTES = {
    "VOICE": "Must be called before FREQ, PULSE, ADSR and WAVE — they all act on the current voice.",
    "HALTINT": "Critical: always HALTINT before your program exits, or the machine is left running your raster interrupt.",
    "INTERRUPT": "Critical: always HALTINT before your program exits, or the machine is left running your raster interrupt.",
    "STARTINT": "Critical: always HALTINT before your program exits, or the machine is left running your raster interrupt.",
    "PROC": "Strings and string variables cannot be returned from subroutines. Call a named subroutine as `TAG.arg,arg`.",
    "SEND": "Strings and string variables cannot be returned from subroutines.",
    "ASSEM": "In ML mode mnemonics are wrapped in `[]` and `;` starts a comment. Branches and jumps may target a BASIC line number directly, e.g. `JMP1000`.",
}


def load(path=None):
    with open(path or source_path()) as fh:
        raw = json.load(fh)

    keywords = []
    for k in raw["keywords"]:
        kw = dict(k)
        kw["unimplemented"] = kw.get("description", "").startswith(UNIMPLEMENTED_MARK)
        kw["composite"] = False
        kw["fragment"] = kw["keyword"] in TOKEN_FRAGMENTS
        keywords.append(kw)

    by_name = {k["keyword"]: k for k in keywords}

    # Composite keywords: the plugin lists them twice — once in compositeKeywords
    # (token pairing) and, for the documented ones, again in keywords. Merge.
    for c in raw["compositeKeywords"]:
        name = c["keyword"]
        existing = by_name.get(name)
        if existing:
            existing["composite"] = True
            existing["tokens"] = c["tokens"]
            continue
        keywords.append(
            {
                "keyword": name,
                "type": "command",
                "category": _guess_category(name),
                "syntax": name,
                "description": c["description"] + ".",
                "tokens": c["tokens"],
                "composite": True,
                "fragment": False,
                "unimplemented": False,
            }
        )
        by_name[name] = keywords[-1]

    for kw in keywords:
        kw["group"] = _group_of(kw)
        extra = EXTRA_NOTES.get(kw["keyword"])
        if extra:
            kw["warning"] = extra
        if kw["keyword"] in MATH_KEYWORDS:
            kw["mathWarning"] = True
        if kw["keyword"] in VAR_KEYWORDS:
            kw["varNote"] = True
        if kw["keyword"] in ML_SAFE:
            kw["mlSafe"] = True

    keywords.sort(key=lambda k: k["keyword"])
    return {
        "name": raw["name"],
        "version": raw["version"],
        "url": raw["url"],
        "author": raw["author"],
        "activationSYS": raw["activationSYS"],
        "mnemonics": raw["assemblerMnemonics"],
        "mlSafe": ML_SAFE,
        "notes": {"math": MATH_WARNING, "variables": VAR_NOTE},
        "keywords": keywords,
    }


def _guess_category(name):
    if name.startswith(("BMP", "MOB")):
        return "graphics"
    if "INT" in name:
        return "system"
    if name.startswith("MODULE"):
        return "editor"
    if name.startswith("POINT"):
        return "flow"
    return "memory"


def _group_of(kw):
    for gid, _label, pred in SCOPE_GROUPS:
        if pred(kw):
            return gid
    return "system"


def groups(db):
    """group id -> (label, [keyword dicts])  in SCOPE_GROUPS order."""
    out = []
    for gid, label, _pred in SCOPE_GROUPS:
        members = [k for k in db["keywords"] if k["group"] == gid]
        if members:
            out.append((gid, label, members))
    return out


def sort_for_alternation(names):
    """Longest first so BMPCLR wins over BMP, MOBXY over MOB."""
    return sorted(set(names), key=lambda n: (-len(n), n))


def plain(name):
    """A keyword made only of letters (safe for vim `syntax keyword`)."""
    return bool(re.fullmatch(r"[A-Za-z]+", name))


def display(name):
    """How the keyword is typed in source (drop the token-pair '(' notation)."""
    return name.rstrip("(")
