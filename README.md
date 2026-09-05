# Vision BASIC — VS Code Extension

Language support for [Vision BASIC](https://www.visionbasic.net) — Dennis
Osborn's compiled BASIC for the Commodore 64.

Everything here is derived from the VisionBASIC plugin definition shipped with
the C64 IDE: token values extracted from the table at `$AC31` in
`VISION BASIC.VEX`, keyword documentation from the Vision BASIC Cheat Sheet.
All **210 keywords** are covered, plus the 56 6502 mnemonics.

## Features

### Syntax highlighting

Every keyword, scoped by category so it picks up your theme's colours:

| Category            | Examples                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Editor & compiler   | `LIST`, `RUN`, `COMP`, `RENUM`, `LISTER`, `MODULE`, `HALT`                                 |
| Assembler           | `ASSEM`, `BASIC`, `START`, `LABEL`, `SYS`                                                  |
| Flow & loops        | `IF`/`THEN`/`ELSE`, `FOR`/`NEXT`/`DO`, `GOTO`, `PROC`, `PASS`, `SEND`                      |
| Variables & types   | `DECIMAL`, `DIM`, `DEF`, `TAG`, `LOCAL`, `GLOBAL`                                          |
| Math & strings      | `ABS`, `WHOLE`, `FRAC`, `INC`, `ADD`; `CHR$`, `MID$`, `DUP$`                               |
| Bitmap & sprites    | `PLOT`, `LINE`, `BITMAP`, `MOBXY`, `SHAPE`, `COLLISION`                                    |
| SID sound           | `VOICE`, `FREQ`, `ADSR`, `WAVE`, `SIDCLR`                                                  |
| Screen, memory, I/O | `COLORS`, `CHARSET`, `PANX`; `STASH`, `FETCH`, `REUPEEK`; `LOAD`, `DISK`, `JOY`            |
| System & interrupts | `INTERRUPT`, `STARTINT`, `HALTINT`, `RASTER`, `PAUSE`                                      |
| Not implemented     | `SQR`, `SIN`, `COS`, `LOG`, `USR`, … flagged as deprecated — Vision BASIC has none of them |

Plus assembler blocks (`[LDA #1: STA $D020]` with 6502 mnemonics scoped
separately), `$D020` hex and `%10101010` binary literals, `{CLR}` PETSCII
escapes inside strings, string variables, tag and `PROC` definitions, named
subroutine calls (`DRAWBOX.X,Y`), and line numbers — both the leading number
and the `GOTO`/`GOSUB` targets that reference it.

`REM` swallows the rest of the line, so a keyword mentioned inside a comment is
not highlighted as code.

### Hover documentation

Hover any keyword for its syntax, description, a parameter table with valid
ranges, an example, and the contextual warnings that matter:

- `VOICE` must come before `FREQ`, `PULSE`, `ADSR` and `WAVE`
- `HALTINT` before exiting a program that uses interrupts
- the no-parentheses, strictly-left-to-right math rule
- the 8-character variable limit
- whether the command is ML-safe (usable inside an `ASSEM` block)
- how composite keywords are tokenised (`BMPCLR` = `BMP` + `CLR`)

Hovering a 6502 mnemonic inside `[...]` explains ML mode instead.

### Completion

All 210 keywords with their syntax and full documentation. Inside a `[...]`
block it offers 6502 mnemonics instead. Unimplemented BASIC V2 keywords are
marked deprecated and sorted last.

### Outline & go-to-definition

`DESC` labels, `PROC` names, `TAG`/`LABEL` constants and `MODULE` names appear
in the outline and breadcrumbs. `F12` jumps from a `GOTO`/`GOSUB`
target to that line, or from a tag to where it is defined.

### Diagnostics

- Use of a BASIC V2 keyword Vision BASIC does not implement (warning)
- Variable names longer than 8 characters, where the rest is silently ignored
  (information) — tags, labels and `PROC` names declared in the file are exempt

Turn them off with `"visionbasic.diagnostics.enabled": false`.

### Line numbering

| Command                                         | Does                                         |
| ----------------------------------------------- | -------------------------------------------- |
| **Vision BASIC: Renumber lines**                | Renumber the file and follow every reference |
| **Vision BASIC: Add line numbers to selection** | Number unnumbered lines                      |

Renumbering knows which arguments are actually line numbers: all of them after
`GOTO`, `GOSUB`, `THEN` and `ELSE` (including `ON A GOTO 10,20,30`), the first
after `DESC`, `TRAP` and `DO`, the **second** after `INTERRUPT` (the first is a
raster line), and the target of `POINT`. Text inside `REM` and `;` comments is
left alone.

### Snippets

30 snippets: `vbprog`, `for`, `forstep`, `do`, `if`, `on`, `sub`, `proc`,
`desc`, `trap`, `interrupt`, `mob`, `mobxy`, `collision`, `sound`, `bitmap`,
`box`, `data`, `asm`, `assem`, `module`, `def`, `local`, `poke`, `joy`, `key`,
`reu`, `openread`, `disk`, `comp`.

### BASIC / ML comment mode

The status bar shows whether you are in BASIC mode (`REM` comments) or ML mode
(`;` comments). Click it to toggle — the editor's comment command follows.

## Installation

### From a package

```bash
npm install
npx vsce package
code --install-extension visionbasic-0.2.0.vsix
```

### From source

Copy this folder to your extensions directory and restart VS Code:

- **macOS/Linux**: `~/.vscode/extensions/visionbasic-0.2.0/`
- **Windows**: `%USERPROFILE%\.vscode\extensions\visionbasic-0.2.0\`

## The `.bas` extension conflict

`.bas` is shared with Visual Basic and other BASIC dialects. The extension also
registers `.vb64` and `.vbas`. If VS Code picks the wrong language, press
`Ctrl+K M` (`Cmd+K M` on macOS) and choose **Vision BASIC**, or pin it per workspace:

```json
{
  "files.associations": {
    "*.bas": "visionbasic"
  }
}
```

## Vision BASIC quirks

- **No parentheses in math**, and no operator precedence — strictly left to
  right. `4+3*5-2*6` is `(((4+3)*5)-2)*6` = 198.
- **Variable names** start with a letter and are significant to 8 characters;
  `!@#%&?` and digits are allowed. A name may contain a keyword but may not
  start with one.
- **Everything is an integer** unless declared `DECIMAL`. Strings end in `$`.
- **Machine language** is entered with `ASSEM` and left with `BASIC`; mnemonics
  go in `[]`, statements inside them are separated by `:`, and `;` starts a
  comment. Branches and jumps may target a BASIC line number directly
  (`JMP1000`).

  ```basic
  10 ASSEM
  20 [LDA #1: ORA #1: STA $D020] ; set border colour
  30 BASIC
  ```

  ML-safe commands: `START`, `GOTO`, `GOSUB`, `RETURN`, `REM`, `TAG`, `PROC`,
  `MODULE`, `LOCAL`, `GLOBAL`, `ADD`, `SUBTRACT`, `COMPARE`, `HALF`, `DOUBLE`,
  `VARIABLES`, `HALT`, `RESUME`, `VERSION`, `DEBUG`, `STARTINT`, `RASTER`,
  `BYTES`, `STRINGS`.

- **Always `HALTINT`** before exiting a program that uses raster interrupts.
- `USR`, `FRE`, `POS`, `SQR`, `LOG`, `EXP`, `COS`, `SIN`, `TAN` and `ATN` are
  **not implemented**.

## Regenerating

See [tools/README.md](tools/README.md). `data/visionbasic.json` and the TextMate
grammar are generated from the C64 IDE plugin definition — edit the generators,
not the output.

There is a matching [Vim plugin](https://github.com/DNSGeek/vim-visionbasic)
built from the same source.

## License

GPL v2
