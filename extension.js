"use strict";

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const LANG = "visionbasic";

/** @type {{keywords: any[], mnemonics: string[], notes: any, mlSafe: string[], groups: any, version: string, url: string}} */
let DB;
/** @type {Map<string, any>} */
const BY_NAME = new Map();
/** @type {Set<string>} */
const MNEMONICS = new Set();

// ─── Database ────────────────────────────────────────────────────────────────

function loadDatabase(context) {
  const file = path.join(context.extensionPath, "data", "visionbasic.json");
  DB = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const kw of DB.keywords) {
    BY_NAME.set(kw.keyword.toUpperCase(), kw);
    // "SPC(" and "TAB(" are written without the paren when looked up as a word.
    const bare = kw.keyword.replace(/\($/, "");
    if (!BY_NAME.has(bare.toUpperCase())) BY_NAME.set(bare.toUpperCase(), kw);
  }
  for (const m of DB.mnemonics) MNEMONICS.add(m.toUpperCase());
}

function lookup(word) {
  return BY_NAME.get(String(word).toUpperCase());
}

// ─── Markdown rendering ──────────────────────────────────────────────────────

function renderKeyword(kw) {
  const md = new vscode.MarkdownString();
  md.supportHtml = false;
  md.appendCodeblock(kw.syntax || kw.keyword, LANG);
  md.appendMarkdown(kw.description || "");

  if (kw.parameters && kw.parameters.length) {
    md.appendMarkdown("\n\n| Parameter | Range | Meaning |\n|---|---|---|\n");
    for (const p of kw.parameters) {
      const name = p.optional ? `_${p.name}_` : `**${p.name}**`;
      const range = p.range || p.type || "";
      md.appendMarkdown(
        `| ${name} | ${range} | ${(p.description || "").replace(/\|/g, "\\|")} |\n`,
      );
    }
  }

  if (kw.example) {
    md.appendMarkdown("\n\n**Example**\n");
    md.appendCodeblock(kw.example, LANG);
  }

  if (kw.notes) md.appendMarkdown(`\n\n${kw.notes}`);
  if (kw.warning) md.appendMarkdown(`\n\n> ⚠️ ${kw.warning}`);
  if (kw.mathWarning) md.appendMarkdown(`\n\n> ℹ️ ${DB.notes.math}`);
  if (kw.varNote) md.appendMarkdown(`\n\n> ℹ️ ${DB.notes.variables}`);
  if (kw.unimplemented) {
    md.appendMarkdown(
      "\n\n> 🚫 This BASIC V2 keyword is **not implemented** by Vision BASIC.",
    );
  }
  if (kw.mlSafe) {
    md.appendMarkdown(
      "\n\n> ✅ ML-safe — may be used inside an `ASSEM` block.",
    );
  }
  if (kw.composite && kw.tokens) {
    md.appendMarkdown(
      `\n\n<small>Tokenised as the pair \`${kw.tokens.join(" + ")}\`.</small>`,
    );
  }
  return md;
}

function renderMnemonic(name) {
  const md = new vscode.MarkdownString();
  md.appendCodeblock(name, "asm");
  md.appendMarkdown(
    "6502 mnemonic. Inside Vision BASIC, machine language lives in `[...]` " +
      "brackets, statements are separated by `:`, and `;` starts a comment. " +
      "Branches and jumps may target a BASIC line number directly, e.g. `JMP1000`.",
  );
  return md;
}

// ─── Context helpers ─────────────────────────────────────────────────────────

/** True when the offset sits inside a `[...]` assembler block. */
function inAssembly(line, character) {
  const before = line.slice(0, character);
  const open = before.lastIndexOf("[");
  const close = before.lastIndexOf("]");
  return open > close;
}

/** Strips the leading line number, if any. */
function statementText(line) {
  return line.replace(/^\s*\d+\s?/, "");
}

// ─── Providers ───────────────────────────────────────────────────────────────

function hoverProvider() {
  return vscode.languages.registerHoverProvider(LANG, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(
        position,
        /[A-Za-z][A-Za-z0-9!@#%&?]*\$?#?/,
      );
      if (!range) return null;
      const word = document.getText(range).toUpperCase();
      const line = document.lineAt(position.line).text;

      if (inAssembly(line, range.start.character) && MNEMONICS.has(word)) {
        return new vscode.Hover(renderMnemonic(word), range);
      }

      // "MODULE END" / "POINT TAG" — try the two-word form first.
      const rest = line.slice(range.end.character);
      const second = /^\s+([A-Za-z]+)/.exec(rest);
      if (second) {
        const pair = lookup(`${word} ${second[1].toUpperCase()}`);
        if (pair) return new vscode.Hover(renderKeyword(pair), range);
      }

      const kw = lookup(word);
      if (kw) return new vscode.Hover(renderKeyword(kw), range);
      if (MNEMONICS.has(word))
        return new vscode.Hover(renderMnemonic(word), range);
      return null;
    },
  });
}

const COMPLETION_KIND = {
  command: vscode.CompletionItemKind.Keyword,
  function: vscode.CompletionItemKind.Function,
  operator: vscode.CompletionItemKind.Operator,
  conditional: vscode.CompletionItemKind.Keyword,
  loop: vscode.CompletionItemKind.Keyword,
};

function completionProvider() {
  return vscode.languages.registerCompletionItemProvider(LANG, {
    provideCompletionItems(document, position) {
      const line = document.lineAt(position.line).text;

      if (inAssembly(line, position.character)) {
        return DB.mnemonics.map((m) => {
          const item = new vscode.CompletionItem(
            m,
            vscode.CompletionItemKind.Operator,
          );
          item.detail = "6502 mnemonic";
          item.documentation = renderMnemonic(m);
          return item;
        });
      }

      const items = [];
      for (const kw of DB.keywords) {
        if (kw.fragment) continue; // BMP/REU/LONG only exist inside composites
        const label = kw.keyword.replace(/\($/, "");
        const item = new vscode.CompletionItem(
          label,
          COMPLETION_KIND[kw.type] || vscode.CompletionItemKind.Keyword,
        );
        item.detail = `${DB.groups[kw.group]} · ${kw.syntax}`;
        item.documentation = renderKeyword(kw);
        if (kw.unimplemented) {
          item.tags = [vscode.CompletionItemTag.Deprecated];
          item.sortText = `zz${label}`;
        }
        items.push(item);
      }
      return items;
    },
  });
}

const SYMBOL_PATTERNS = [
  // DESC 1000, DRAWSCREEN
  {
    re: /\bDESC\s+(\d+)\s*,\s*([A-Za-z][A-Za-z0-9!@#%&?]*)/i,
    name: (m) => m[2],
    detail: (m) => `line ${m[1]}`,
    kind: () => vscode.SymbolKind.Function,
  },
  {
    re: /\bPROC\s+([A-Za-z][A-Za-z0-9!@#%&?]*)/i,
    name: (m) => m[1],
    kind: () => vscode.SymbolKind.Function,
  },
  {
    re: /\b(?:TAG|LABEL)\s+([A-Za-z][A-Za-z0-9!@#%&?]*)/i,
    name: (m) => m[1],
    kind: () => vscode.SymbolKind.Constant,
  },
  {
    re: /\bMODULE\s+"([^"]+)"/i,
    name: (m) => m[1],
    kind: () => vscode.SymbolKind.Module,
  },
];

function documentSymbolProvider() {
  return vscode.languages.registerDocumentSymbolProvider(LANG, {
    provideDocumentSymbols(document) {
      const symbols = [];
      for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;
        for (const p of SYMBOL_PATTERNS) {
          const m = p.re.exec(text);
          if (!m) continue;
          const range = document.lineAt(i).range;
          const sym = new vscode.DocumentSymbol(
            p.name(m),
            p.detail ? p.detail(m) : "",
            p.kind(m),
            range,
            range,
          );
          symbols.push(sym);
          break;
        }
      }
      return symbols;
    },
  });
}

function definitionProvider() {
  return vscode.languages.registerDefinitionProvider(LANG, {
    provideDefinition(document, position) {
      const line = document.lineAt(position.line).text;

      // GOTO 1000 / GOSUB 1000 / THEN 1000 → the line with that number.
      const numRange = document.getWordRangeAtPosition(position, /\d+/);
      if (numRange && numRange.start.character > 0) {
        const target = document.getText(numRange);
        for (let i = 0; i < document.lineCount; i++) {
          const m = /^\s*(\d+)/.exec(document.lineAt(i).text);
          if (m && m[1] === target) {
            return new vscode.Location(document.uri, new vscode.Position(i, 0));
          }
        }
      }

      // A tag / PROC name → its DESC, PROC, TAG or LABEL definition.
      const wordRange = document.getWordRangeAtPosition(
        position,
        /[A-Za-z][A-Za-z0-9!@#%&?]*/,
      );
      if (!wordRange) return null;
      const word = document.getText(wordRange);
      if (lookup(word)) return null; // it's a keyword, not a tag
      void line;

      const def = new RegExp(
        `\\b(?:DESC\\s+\\d+\\s*,|TAG|LABEL|PROC)\\s+${word}\\b`,
        "i",
      );
      for (let i = 0; i < document.lineCount; i++) {
        const m = def.exec(document.lineAt(i).text);
        if (m) {
          return new vscode.Location(
            document.uri,
            new vscode.Position(i, m.index),
          );
        }
      }
      return null;
    },
  });
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

function makeDiagnostics(context) {
  const collection = vscode.languages.createDiagnosticCollection(LANG);
  context.subscriptions.push(collection);

  const unimplemented = DB.keywords
    .filter((k) => k.unimplemented)
    .map((k) => k.keyword);
  const unimplementedRe = new RegExp(
    `\\b(${unimplemented.join("|")})\\b`,
    "gi",
  );

  function check(document) {
    if (!document || document.languageId !== LANG) return;
    const cfg = vscode.workspace.getConfiguration(LANG);
    if (!cfg.get("diagnostics.enabled", true)) {
      collection.delete(document.uri);
      return;
    }
    // Tags, labels and PROC names live in their own table; the 8-character
    // rule below is about variables, so collect the declared names and skip
    // them rather than nagging about every DESC label.
    const declared = new Set();
    const declRe =
      /\b(?:DESC\s+\d+\s*,|TAG|LABEL|PROC|POINT\s+TAG)\s+([A-Za-z][A-Za-z0-9!@#%&?]*)/gi;
    for (let i = 0; i < document.lineCount; i++) {
      const text = document.lineAt(i).text;
      declRe.lastIndex = 0;
      let m;
      while ((m = declRe.exec(text)) !== null) declared.add(m[1].toUpperCase());
    }

    const diags = [];
    for (let i = 0; i < document.lineCount; i++) {
      const raw = document.lineAt(i).text;
      // Ignore comments and string literals — cheap but effective.
      const code = statementText(raw)
        .replace(/"[^"]*"?/g, (s) => " ".repeat(s.length))
        .replace(/(\bREM\b|;).*$/i, (s) => " ".repeat(s.length));

      unimplementedRe.lastIndex = 0;
      let m;
      while ((m = unimplementedRe.exec(code)) !== null) {
        const offset = raw.length - code.length + m.index;
        diags.push(
          new vscode.Diagnostic(
            new vscode.Range(i, offset, i, offset + m[0].length),
            `${m[0].toUpperCase()} is a BASIC V2 function that Vision BASIC does not implement.`,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }

      // Variable names are significant to 8 characters; the rest is ignored.
      const nameRe =
        /(?<![A-Za-z0-9!@#%&?$.])([A-Za-z][A-Za-z0-9!@#%&?]{8,})\$?/g;
      let v;
      while ((v = nameRe.exec(code)) !== null) {
        const upper = v[1].toUpperCase();
        if (lookup(upper) || MNEMONICS.has(upper) || declared.has(upper))
          continue;
        const offset = raw.length - code.length + v.index;
        const d = new vscode.Diagnostic(
          new vscode.Range(i, offset, i, offset + v[1].length),
          `"${v[1]}" is longer than 8 characters; Vision BASIC ignores everything past "${v[1].slice(0, 8)}".`,
          vscode.DiagnosticSeverity.Information,
        );
        diags.push(d);
      }
    }
    collection.set(document.uri, diags);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => check(e.document)),
    vscode.workspace.onDidOpenTextDocument(check),
    vscode.workspace.onDidCloseTextDocument((d) => collection.delete(d.uri)),
  );
  vscode.workspace.textDocuments.forEach(check);
  return check;
}

// ─── Status bar / comment mode ───────────────────────────────────────────────

function makeStatusBar(context) {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBar.command = "visionbasic.toggleCommentMode";
  let mlMode = false;

  function render() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== LANG) {
      statusBar.hide();
      return;
    }
    statusBar.text = mlMode
      ? "$(circuit-board) VB: ML mode"
      : "$(code) VB: BASIC mode";
    statusBar.tooltip = mlMode
      ? "Vision BASIC: ML comment mode (;) — click to switch"
      : "Vision BASIC: BASIC comment mode (REM) — click to switch";
    statusBar.show();
  }

  const toggle = vscode.commands.registerCommand(
    "visionbasic.toggleCommentMode",
    () => {
      mlMode = !mlMode;
      // VS Code caches language-configuration comment tokens per language, so
      // rewrite the whole configuration to change the line comment at runtime.
      vscode.languages.setLanguageConfiguration(LANG, {
        comments: { lineComment: mlMode ? ";" : "REM" },
      });
      render();
      vscode.window.setStatusBarMessage(
        `Vision BASIC: ${mlMode ? "ML comments (;)" : "BASIC comments (REM)"}`,
        2000,
      );
    },
  );

  context.subscriptions.push(
    statusBar,
    toggle,
    vscode.window.onDidChangeActiveTextEditor(render),
  );
  render();
}

// ─── Commands ────────────────────────────────────────────────────────────────

function renumberCommand() {
  return vscode.commands.registerCommand("visionbasic.renumber", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== LANG) return;

    const start = await vscode.window.showInputBox({
      prompt: "First line number",
      value: "10",
      validateInput: (v) => (/^\d+$/.test(v) ? null : "Digits only"),
    });
    if (start === undefined) return;
    const step = await vscode.window.showInputBox({
      prompt: "Increment",
      value: "10",
      validateInput: (v) => (/^[1-9]\d*$/.test(v) ? null : "Positive integer"),
    });
    if (step === undefined) return;

    const doc = editor.document;
    const map = new Map(); // old line number -> new line number
    let next = parseInt(start, 10);
    const inc = parseInt(step, 10);
    for (let i = 0; i < doc.lineCount; i++) {
      const m = /^\s*(\d+)/.exec(doc.lineAt(i).text);
      if (!m) continue;
      map.set(m[1], String(next));
      next += inc;
    }

    await editor.edit((edit) => {
      for (let i = 0; i < doc.lineCount; i++) {
        const line = doc.lineAt(i);
        const text = renumberLine(line.text, map);
        if (text !== line.text) edit.replace(line.range, text);
      }
    });
  });
}

// Which arguments of a keyword are line numbers:
//   "all"  every number in the comma-separated list  (ON A GOTO 10,20,30)
//   1      only the first                            (TRAP 9000, ERRADDR)
//   2      only the second                           (INTERRUPT 100, 1000)
// POINT is handled separately: its line number follows an "=".
const LINE_REFERENCES = [
  {
    re: /\b(?:GOTO|GOSUB|THEN|ELSE)\b(\s*\d+\s*(?:,\s*\d+\s*)*)/gi,
    which: "all",
  },
  { re: /\b(?:DESC|TRAP|DO)\b(\s*\d+\s*(?:,\s*\d+\s*)*)/gi, which: 1 },
  { re: /\bINTERRUPT\b(\s*\d+\s*(?:,\s*\d+\s*)*)/gi, which: 2 },
];
const POINT_REFERENCE =
  /(\bPOINT\b(?:\s+TAG)?\s+[A-Za-z][A-Za-z0-9!@#%&?]*\s*=\s*)(\d+)/gi;

function mapArgs(args, which, map) {
  let index = 0;
  return args
    .split(",")
    .map((part) => {
      if (!/^\s*\d+\s*$/.test(part)) return part;
      index += 1;
      if (which !== "all" && which !== index) return part;
      return part.replace(/\d+/, (n) => map.get(n) || n);
    })
    .join(",");
}

/** Renumber one line and every line-number reference it contains. */
function renumberLine(text, map) {
  // Leave anything from a REM or ML comment onwards untouched.
  const cut = text.search(/\bREM\b|;/i);
  let code = cut < 0 ? text : text.slice(0, cut);
  const tail = cut < 0 ? "" : text.slice(cut);

  code = code.replace(/^(\s*)(\d+)/, (_, ws, n) => ws + (map.get(n) || n));
  for (const { re, which } of LINE_REFERENCES) {
    re.lastIndex = 0;
    code = code.replace(
      re,
      (whole, args) =>
        whole.slice(0, whole.length - args.length) + mapArgs(args, which, map),
    );
  }
  POINT_REFERENCE.lastIndex = 0;
  code = code.replace(
    POINT_REFERENCE,
    (_, head, n) => head + (map.get(n) || n),
  );

  return code + tail;
}

function insertLineNumbersCommand() {
  return vscode.commands.registerCommand(
    "visionbasic.numberSelection",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== LANG) return;
      const start = await vscode.window.showInputBox({
        prompt: "First line number",
        value: "10",
        validateInput: (v) => (/^\d+$/.test(v) ? null : "Digits only"),
      });
      if (start === undefined) return;
      let next = parseInt(start, 10);
      const sel = editor.selection;
      await editor.edit((edit) => {
        for (let i = sel.start.line; i <= sel.end.line; i++) {
          const line = editor.document.lineAt(i);
          if (!line.text.trim() || /^\s*\d/.test(line.text)) continue;
          edit.insert(new vscode.Position(i, 0), `${next} `);
          next += 10;
        }
      });
    },
  );
}

// ─── Activation ──────────────────────────────────────────────────────────────

function activate(context) {
  loadDatabase(context);

  context.subscriptions.push(
    hoverProvider(),
    completionProvider(),
    documentSymbolProvider(),
    definitionProvider(),
    renumberCommand(),
    insertLineNumbersCommand(),
  );

  makeDiagnostics(context);
  makeStatusBar(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
