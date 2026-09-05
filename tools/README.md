# Generators

The keyword database, the TextMate grammar and the vim plugin's syntax, autoload
and help files are all derived from one source of truth: the **VisionBASIC
plugin definition shipped with the C64 IDE**
(`Resources/Plugins/VisionBASIC_1.1.c64basic`). Its token values come from the
table at `$AC31` in `VISION BASIC.VEX`; its documentation comes from the Vision
BASIC Cheat Sheet.

Regenerate after updating that definition — do not hand-edit the generated
files:

```bash
python3 tools/gen_data.py --plugin /path/to/VisionBASIC_1.1.c64basic
python3 tools/gen_grammar.py --plugin /path/to/VisionBASIC_1.1.c64basic
```

The path can also come from `$VISIONBASIC_PLUGIN`, or from `DEFAULT_SRC` in
`vbdb.py`.

| Script           | Writes                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `gen_data.py`    | `data/visionbasic.json` — the database `extension.js` loads at runtime |
| `gen_grammar.py` | `syntaxes/visionbasic.tmLanguage.json`                                 |

`vbdb.py` normalises the plugin definition: it merges the composite keywords
(`BMPCLR` = `BMP` + `CLR`, `REUPEEK` = `REU` + `PEEK`, …) into the main keyword
list, sorts keywords into highlight groups, and attaches the contextual notes —
the no-parentheses math rule, the 8-character variable rule, the VOICE and
HALTINT warnings, and the ML-safe command list.

`snippets/visionbasic.json` is hand-written, not generated; the vim plugin
converts it into UltiSnips and SnipMate form.
