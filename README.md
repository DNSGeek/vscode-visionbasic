# Vision BASIC — VSCode Extension

Syntax highlighting, hover documentation, snippets and tools for **Vision BASIC** — the enhanced Commodore 64 BASIC environment.

## Features

### Syntax Highlighting

Full TextMate grammar covering every command category:

| Category | Examples |
|---|---|
| Editing keywords | `LIST`, `RUN`, `COMP`, `RENUM`, `ASSEM`, `BASIC` |
| Disk commands | `LOAD`, `SAVE`, `DIR`, `DISK`, `VERIFY` |
| Math functions | `ABS`, `INT`, `RND`, `RANDOM`, `FRAC` |
| Speedy math | `INC`, `DEC`, `ADD`, `SUBTRACT`, `HALF`, `DOUBLE` |
| Bitmap commands | `PLOT`, `LINE`, `HLINE`, `VLINE`, `BITMAP` |
| Sprite/MOB commands | `MOB`, `MOBXY`, `SHAPE`, `COLLISION`, `DETECT` |
| Interrupt commands | `INTERRUPT`, `STARTINT`, `HALTINT`, `RASTER` |
| SID sound commands | `VOICE`, `FREQ`, `ADSR`, `WAVE`, `SIDCLR` |
| Text video commands | `COLORS`, `CHARSET`, `PANX`, `PANY`, `VIDLOC` |
| Assembler blocks | `[LDA #1: STA $D020]` highlighted with 6502 mnemonics |
| ML comments | `;` inside assembler blocks |
| BASIC comments | `REM` lines |
| Strings | `"quoted strings"` |
| String variables | `NAME$`, `SCORE$` |
| Hex numbers | `$D020`, `$FF00` |
| Line numbers | Leading digits on each line |

### Hover Documentation

Hover over **any Vision BASIC keyword** to see its full signature and description pulled from the DNSGeek cheat sheet, including:

- Complete parameter lists
- Contextual warnings (e.g. "VOICE must be called before FREQ/ADSR/WAVE")
- Math expression reminders (no parentheses! left-to-right only!)
- Subroutine limitations (no string return values)

### Snippets

Type a prefix and hit Tab for common patterns:

| Prefix | Snippet |
|---|---|
| `for` | FOR-TO-NEXT loop |
| `if` | IF-THEN-ELSE block |
| `sub` | GOSUB subroutine skeleton |
| `proc` | PROC subroutine with parameter |
| `interrupt` | Raster interrupt skeleton |
| `mob` | Sprite/MOB setup |
| `sound` | SID voice setup |
| `bitmap` | Bitmap mode enable |
| `data` | DATA block with READ loop |
| `asm` | Inline assembler block |
| `poke` | POKE screen colors |
| `joy` | Joystick read with direction checks |

### BASIC/ML Mode Indicator

The status bar shows whether you're in **BASIC mode** (REM comments) or **ML mode** (; comments). Click it to toggle. Affects your mental model when writing mixed BASIC/assembler code.

## Installation

### From source (development)

1. Copy the `vscode-visionbasic/` folder to your VSCode extensions directory:
   - **macOS/Linux**: `~/.vscode/extensions/visionbasic-0.1.0/`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\visionbasic-0.1.0\`

2. Restart VSCode.

3. Open a `.bas` file and select **Vision BASIC** as the language if VSCode doesn't pick it up automatically (use `Ctrl+K M` / `Cmd+K M`).

### Package as .vsix (optional)

```bash
cd vscode-visionbasic
npm install
npx vsce package
code --install-extension visionbasic-0.1.0.vsix
```

## The `.bas` Extension Conflict

`.bas` is also used by Visual Basic and other BASIC dialects. If VSCode picks the wrong language:

- Press `Ctrl+K M` (macOS: `Cmd+K M`) and choose **Vision BASIC**
- Or add to your workspace `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.bas": "visionbasic"
  }
}
```

## Vision BASIC Quick Reference

### Critical Quirks

- **No parentheses in math**: `A=3+4:A=A*4` not `A=4*(3+4)`
- **Strict left-to-right evaluation**: `4+3*5` = 35, not 19
- **Variable names**: max 8 characters, must start with a letter
- **Strings**: variable names must end with `$`
- **Integer by default**: use `DECIMAL` to declare floating point variables
- **Tags**: cannot be to the left of an `=` sign in a math expression

### Assembler Mode

```
10 ASSEM
20 [LDA #1: ORA #1: STA $D020]; set border color
30 BASIC
```

- Enter with `ASSEM`, exit with `BASIC`
- Mnemonics go inside `[]` brackets
- Comments inside ML use `;`
- ML-safe BASIC commands: `START`, `GOTO`, `GOSUB`, `RETURN`, `REM`, `TAG`, `PROC`, `MODULE`, `LOCAL`, `GLOBAL`, `ADD`, `SUBTRACT`, `COMPARE`, `HALF`, `DOUBLE`, `VARIABLES`, `HALT`, `RESUME`, `VERSION`, `DEBUG`, `STARTINT`, `RASTER`, `BYTES`, `STRINGS`

### Sound (SID)

Always call `VOICE` before `FREQ`, `PULSE`, `ADSR`, and `WAVE`.

### Interrupts

Always call `HALTINT` before exiting a program that uses raster interrupts.

## License

MIT
