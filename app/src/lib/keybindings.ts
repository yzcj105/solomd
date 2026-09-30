/**
 * Rebindable keyboard shortcuts (#180).
 *
 * Until now every app-level shortcut lived in one long if/else chain in
 * `useShortcuts.ts`, which meant the answer to "how do I change a shortcut"
 * was "you can't". This module turns that chain into data: a table of
 * bindable actions with their defaults, plus the combo parsing/formatting
 * both the dispatcher and the settings UI need.
 *
 * Combo syntax is a normalized string — `Mod+Shift+K`, `Mod+Alt+ArrowRight`,
 * `Shift+F3`, `F1`. Parts are ordered Mod, Alt, Shift, key so two spellings
 * of the same chord can never disagree. `Mod` is ⌘ on macOS and Ctrl
 * everywhere else, which is what lets one table serve every platform.
 *
 * Editor-internal keys (CodeMirror's own keymap: ⌘J AI rewrite, list
 * indentation, …) are deliberately NOT here. They live inside the editor's
 * keymap where CodeMirror resolves them against the document context, and
 * folding them into a global table would change when they fire.
 */

export type KeyCombo = string;

export interface KeyActionDef {
  /** Stable id — matches the command registry's id where one exists. */
  id: string;
  /** Name shown in Settings. English, like the command palette's titles. */
  label: string;
  category: 'file' | 'edit' | 'view' | 'navigate' | 'tools';
  /**
   * Defaults, in priority order. A few actions ship two chords — ⌘N and ⌘T
   * both make a note, F1 and ⌘/ both open help — because both are muscle
   * memory from different editors. A user binding replaces the whole set.
   */
  defaults: KeyCombo[];
  /**
   * Platforms this action exists on. Omitted means all of them, which is the
   * case for everything except `file.exit` — see its entry.
   */
  platforms?: ('mac' | 'windows' | 'linux')[];
}

/** Which platform's key table to build. Overridable so tests can pin one. */
function currentPlatform(): 'mac' | 'windows' | 'linux' {
  // `?forcePlatform=windows` is a dev-only QA hook, the same idea as
  // `?forcePlain` / `?forceWinChrome`: it lets the Windows-only parts of the
  // shortcut panel be driven from a macOS dev build. The Tauri shell has no
  // URL bar, so it is inert for real users.
  if (typeof location !== 'undefined') {
    const forced = /[?&]forcePlatform=(mac|windows|linux)\b/.exec(location.search);
    if (forced) return forced[1] as 'mac' | 'windows' | 'linux';
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Mac|iPhone|iPad/.test(ua)) return 'mac';
  if (/Win/.test(ua)) return 'windows';
  return 'linux';
}

/** The actions bindable on this platform. Every consumer iterates this, not
 *  `KEY_ACTIONS`, so a platform-gated action never reaches the settings list,
 *  the resolver, or the conflict check. */
export function activeKeyActions(
  platform: 'mac' | 'windows' | 'linux' = currentPlatform(),
): KeyActionDef[] {
  return KEY_ACTIONS.filter((a) => !a.platforms || a.platforms.includes(platform));
}

/**
 * Every app-level shortcut, transcribed from the pre-#180 handler so the
 * defaults are byte-for-byte what shipped before.
 */
export const KEY_ACTIONS: KeyActionDef[] = [
  // ---- File ----
  { id: 'file.new', label: 'New Note', category: 'file', defaults: ['Mod+N', 'Mod+T'] },
  { id: 'file.newText', label: 'New Plain Text File', category: 'file', defaults: ['Mod+Alt+N'] },
  // #338 — a note in the folder selected in the file tree (or the selected
  // file's folder). No native menu item carries it, so it needs no entry in
  // MENU_ITEM_BY_ACTION.
  { id: 'file.newInFolder', label: 'New Note in Selected Folder', category: 'file', defaults: ['Mod+Alt+Shift+N'] },
  { id: 'file.open', label: 'Open File…', category: 'file', defaults: ['Mod+O'] },
  { id: 'file.import', label: 'Import Documents…', category: 'file', defaults: ['Mod+Shift+L'] },
  { id: 'file.save', label: 'Save', category: 'file', defaults: ['Mod+S'] },
  { id: 'file.saveAs', label: 'Save As…', category: 'file', defaults: ['Mod+Shift+S'] },
  { id: 'file.closeTab', label: 'Close Tab', category: 'file', defaults: ['Mod+W'] },
  { id: 'file.openExternal', label: 'Open in External Editor', category: 'file', defaults: ['Mod+Shift+E'] },
  { id: 'window.new', label: 'New Window', category: 'file', defaults: ['Mod+Shift+N'] },
  // #272 — not on macOS: Quit ⌘Q belongs to the OS app menu, and the native
  // Exit item is built `#[cfg(target_os = "linux")]`, so a rebind here could
  // never reach the menu that actually owns the chord. Listing it in Settings
  // would be the exact lie #180 set out to remove.
  {
    id: 'file.exit',
    label: 'Exit',
    category: 'file',
    defaults: ['Mod+Q'],
    platforms: ['windows', 'linux'],
  },

  // ---- Edit ----
  { id: 'editor.caseCycle', label: 'Cycle Case of Selection', category: 'edit', defaults: ['Shift+F3'] },
  // ---- Formatting (#296, #274) ----
  // Bold is NOT on Mod+B by default: that has toggled the file tree since
  // 1.0 (the VS Code habit), and taking it away from everyone to match the
  // Typora habit trades one group's muscle memory for another's. The writer
  // preset below swaps the two in one click instead.
  { id: 'fmt.bold', label: 'Bold', category: 'edit', defaults: ['Mod+Shift+B'] },
  { id: 'fmt.italic', label: 'Italic', category: 'edit', defaults: ['Mod+I'] },
  { id: 'fmt.strike', label: 'Strikethrough', category: 'edit', defaults: ['Mod+Shift+X'] },
  { id: 'fmt.code', label: 'Inline Code', category: 'edit', defaults: ['Mod+Shift+M'] },
  { id: 'fmt.link', label: 'Link', category: 'edit', defaults: ['Mod+K'] },
  { id: 'fmt.h1', label: 'Heading 1', category: 'edit', defaults: ['Mod+1'] },
  { id: 'fmt.h2', label: 'Heading 2', category: 'edit', defaults: ['Mod+2'] },
  { id: 'fmt.h3', label: 'Heading 3', category: 'edit', defaults: ['Mod+3'] },
  { id: 'fmt.h4', label: 'Heading 4', category: 'edit', defaults: ['Mod+4'] },
  { id: 'fmt.h5', label: 'Heading 5', category: 'edit', defaults: ['Mod+5'] },
  { id: 'fmt.h6', label: 'Heading 6', category: 'edit', defaults: ['Mod+6'] },
  { id: 'fmt.quote', label: 'Blockquote', category: 'edit', defaults: ['Mod+Alt+Q'] },
  { id: 'fmt.ul', label: 'Bulleted List', category: 'edit', defaults: ['Mod+Alt+8'] },
  { id: 'fmt.ol', label: 'Numbered List', category: 'edit', defaults: ['Mod+Alt+7'] },
  { id: 'fmt.task', label: 'Task List', category: 'edit', defaults: ['Mod+Alt+9'] },
  { id: 'fmt.codeblock', label: 'Code Block', category: 'edit', defaults: ['Mod+Alt+K'] },
  { id: 'format.markdown', label: 'Format Markdown', category: 'edit', defaults: ['Mod+Alt+L'] },
  { id: 'editor.tableEditor', label: 'Edit Table as Grid', category: 'edit', defaults: ['Mod+Alt+T'] },
  { id: 'editor.formulaEditor', label: 'Edit Formula', category: 'edit', defaults: ['Mod+Alt+M'] },
  { id: 'editor.aiRewrite', label: 'AI Rewrite Selection', category: 'edit', defaults: ['Mod+J'] },
  { id: 'export.copyHtml', label: 'Copy as HTML', category: 'edit', defaults: ['Mod+Shift+C'] },
  { id: 'export.copyMd', label: 'Copy as Markdown', category: 'edit', defaults: ['Mod+Alt+C'] },
  { id: 'export.pdfPrint', label: 'Print / PDF', category: 'edit', defaults: ['Mod+Alt+Shift+P'] },

  // ---- View ----
  { id: 'view.cycleView', label: 'Cycle Edit / Split / Preview', category: 'view', defaults: ['Mod+Shift+P'] },
  // #180: Typora users flip source <-> WYSIWYG with Ctrl+/. That chord is
  // Markdown Help here, so the default is Mod+Alt+/; rebind it to Mod+/ in
  // Settings -> Shortcuts to get Typora's muscle memory back.
  { id: 'view.toggleLiveEdit', label: 'Toggle Live Edit / Edit Only', category: 'view', defaults: ['Mod+Alt+Slash'] },
  { id: 'view.toggleReading', label: 'Toggle Reading Mode', category: 'view', defaults: ['Mod+Shift+R'] },
  { id: 'view.toggleFileTree', label: 'Toggle File Tree', category: 'view', defaults: ['Mod+B'] },
  { id: 'view.toggleRightSidebar', label: 'Toggle Right Sidebar', category: 'view', defaults: ['Mod+Alt+B'] },
  { id: 'view.toggleOutline', label: 'Toggle Outline', category: 'view', defaults: ['Mod+Shift+O'] },
  { id: 'view.toggleInspector', label: 'Toggle Properties Inspector', category: 'view', defaults: ['Mod+Shift+I'] },
  { id: 'view.toggleToolbar', label: 'Show / Hide Toolbar Buttons', category: 'view', defaults: ['Mod+Alt+Shift+T'] },
  { id: 'view.slideshow', label: 'Slideshow', category: 'view', defaults: ['Mod+Alt+P'] },
  // Folding. The chords mirror CodeMirror's own fold keymap so the muscle
  // memory carries over — but they are handled at app level, which is what
  // makes them work in the Windows plain-textarea editor too (it has no
  // CodeMirror keymap to reach).
  { id: 'fold.toggle', label: 'Fold / Unfold Section at Cursor', category: 'view', defaults: ['Mod+Shift+BracketLeft'] },
  { id: 'fold.all', label: 'Fold All Sections', category: 'view', defaults: ['Mod+Alt+BracketLeft'] },
  { id: 'fold.none', label: 'Unfold All', category: 'view', defaults: ['Mod+Alt+BracketRight'] },

  // ---- Navigate ----
  { id: 'palette.open', label: 'Command Palette', category: 'navigate', defaults: ['Mod+Shift+K'] },
  { id: 'quickSwitcher.open', label: 'Quick File Switcher', category: 'navigate', defaults: ['Mod+P'] },
  { id: 'search.global', label: 'Search in Folder', category: 'navigate', defaults: ['Mod+Shift+F'] },
  { id: 'editor.find', label: 'Find in Preview', category: 'navigate', defaults: ['Mod+F'] },
  { id: 'tab.prev', label: 'Previous Tab', category: 'navigate', defaults: ['Mod+BracketLeft'] },
  { id: 'tab.next', label: 'Next Tab', category: 'navigate', defaults: ['Mod+BracketRight'] },
  { id: 'tile.splitRight', label: 'Split Pane Right', category: 'navigate', defaults: ['Mod+Backslash'] },
  { id: 'tile.splitDown', label: 'Split Pane Down', category: 'navigate', defaults: ['Mod+Shift+Backslash'] },
  { id: 'tile.focusNext', label: 'Focus Next Pane', category: 'navigate', defaults: ['Mod+Alt+ArrowRight'] },
  { id: 'tile.focusPrev', label: 'Focus Previous Pane', category: 'navigate', defaults: ['Mod+Alt+ArrowLeft'] },

  // ---- Tools ----
  { id: 'settings.open', label: 'Settings', category: 'tools', defaults: ['Mod+Comma'] },
  { id: 'help.markdown', label: 'Markdown Help', category: 'tools', defaults: ['F1', 'Mod+Slash'] },
  { id: 'proofread.cjk', label: 'CJK Proofread', category: 'tools', defaults: ['Mod+Shift+J'] },
  { id: 'daily.openToday', label: "Open Today's Daily Note", category: 'tools', defaults: ['Mod+D'] },
  { id: 'inbox.toggle', label: 'Toggle Inbox Flag / Organize', category: 'tools', defaults: ['Mod+E'] },
  { id: 'pomodoro.startLast', label: 'Start Writing Session (Zen)', category: 'tools', defaults: ['Mod+Shift+Z'] },
];

/** Keys whose `event.key` is punctuation — spelled by code for stability. */
const PUNCT_BY_CODE: Record<string, string> = {
  Comma: ',',
  Slash: '/',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Semicolon: ';',
  Quote: "'",
  Period: '.',
  Backquote: '`',
};
const CODE_BY_PUNCT: Record<string, string> = Object.fromEntries(
  Object.entries(PUNCT_BY_CODE).map(([code, ch]) => [ch, code]),
);

/**
 * Normalized chord for a keydown, or null when the event carries no usable
 * key (a bare modifier, an IME composition).
 *
 * The `event.code` preference for Alt combos is load-bearing, not a style
 * choice: macOS composes Option+letter into another glyph (⌥C arrives as
 * "ç", ⌥N as "Dead"), so matching on `event.key` would make every Alt
 * shortcut silently dead there. Scoped to Alt so non-Latin layouts keep
 * using `key` for everything else.
 */
export function eventToCombo(e: KeyboardEvent): KeyCombo | null {
  if (e.isComposing) return null;
  const raw = e.key;
  if (!raw || raw === 'Dead' || raw === 'Unidentified') {
    // Alt on macOS can produce "Dead" — fall through to the code path below
    // rather than dropping the event.
    if (!(e.altKey && /^(Key[A-Z]|Digit\d)$/.test(e.code))) return null;
  }
  if (['Control', 'Meta', 'Shift', 'Alt', 'CapsLock'].includes(raw)) return null;

  let key: string;
  if (e.altKey && /^Key[A-Z]$/.test(e.code)) {
    key = e.code.slice(3).toUpperCase();
  } else if (e.altKey && /^Digit\d$/.test(e.code)) {
    // Same story for the number row: ⌥8 arrives as "•", ⌥7 as "¶".
    key = e.code.slice(5);
  } else if (PUNCT_BY_CODE[e.code]) {
    key = e.code;
  } else if (/^F\d{1,2}$/.test(raw)) {
    key = raw;
  } else if (raw.length === 1) {
    key = raw.toUpperCase();
  } else {
    key = raw; // ArrowLeft, Enter, Escape, Tab, Backspace…
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

/** Canonical ordering, so `Shift+Mod+k` and `Mod+Shift+K` are one binding. */
export function normalizeCombo(combo: string): KeyCombo {
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  const key = parts.pop() ?? '';
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  const out: string[] = [];
  if (mods.has('mod') || mods.has('cmd') || mods.has('ctrl') || mods.has('control') || mods.has('meta')) out.push('Mod');
  if (mods.has('alt') || mods.has('option')) out.push('Alt');
  if (mods.has('shift')) out.push('Shift');
  const punctCode = CODE_BY_PUNCT[key];
  out.push(punctCode ?? (key.length === 1 ? key.toUpperCase() : key));
  return out.join('+');
}

/** Human-readable chord: `⌘⇧K` on macOS, `Ctrl+Shift+K` elsewhere. */
export function formatCombo(combo: KeyCombo, isMac: boolean): string {
  const parts = combo.split('+');
  const key = parts.pop() ?? '';
  const has = (m: string) => parts.includes(m);
  const shown = PUNCT_BY_CODE[key] ?? key.replace(/^Arrow/, '');
  if (isMac) {
    return `${has('Mod') ? '⌘' : ''}${has('Alt') ? '⌥' : ''}${has('Shift') ? '⇧' : ''}${shown}`;
  }
  const mods = [has('Mod') && 'Ctrl', has('Alt') && 'Alt', has('Shift') && 'Shift'].filter(Boolean);
  return [...mods, shown].join('+');
}

/**
 * Effective binding table: defaults with the user's overrides applied.
 *
 * An override of `null` means "unbound" — a user who wants ⌘E back for the
 * browser/OS gets to switch ours off rather than being told to live with it.
 */
export function resolveBindings(
  overrides: Record<string, string | null | undefined> = {},
): Map<KeyCombo, string> {
  const map = new Map<KeyCombo, string>();
  for (const action of activeKeyActions()) {
    const override = overrides[action.id];
    if (override === null) continue;
    const combos = override ? [normalizeCombo(override)] : action.defaults.map(normalizeCombo);
    for (const combo of combos) {
      // First writer wins, so an earlier action in the table keeps a chord a
      // later one also asks for. The settings UI surfaces the clash before it
      // gets here; this is the tiebreak for a hand-edited settings file.
      if (!map.has(combo)) map.set(combo, action.id);
    }
  }
  return map;
}

/** The chords currently bound to one action (for display in settings). */
export function combosFor(
  actionId: string,
  overrides: Record<string, string | null | undefined> = {},
): KeyCombo[] {
  const action = activeKeyActions().find((a) => a.id === actionId);
  if (!action) return [];
  const override = overrides[actionId];
  if (override === null) return [];
  return override ? [normalizeCombo(override)] : action.defaults.map(normalizeCombo);
}

/**
 * Chords another program takes over before SoloMD can see them.
 *
 * Reported from a Windows 10 machine with an AMD card (2026-09-20): AMD
 * Software's global hotkeys swallow most of the Ctrl+Shift row, so those
 * commands simply never fire — the driver's own overlay answers instead.
 * Microsoft Pinyin takes one more. These are *global* hotkeys, registered by
 * the other program at the OS level, so there is nothing the app can do at
 * runtime except say so and offer somewhere else to put the command.
 *
 * Defaults deliberately stay as they are: most people do not run this
 * software, and moving everyone's keys to dodge one vendor's overlay costs
 * more muscle memory than it saves. The settings panel flags the affected
 * rows and offers the alternatives below in one click.
 *
 * Only chords that are really *intercepted* belong here. Ctrl+Shift+P is a
 * habit clash with VS Code's palette, not an interception, and listing it
 * would blur what this table means.
 */
export interface HotkeyInterception {
  /** The chord, as `combosFor` spells it. */
  combo: KeyCombo;
  /** What takes it — shown to the user verbatim. */
  source: string;
  platforms: ('mac' | 'windows' | 'linux')[];
  /** Where the compatibility preset moves the command. */
  alternative: KeyCombo;
}

const AMD = 'AMD Software: Adrenalin Edition';

export const HOTKEY_INTERCEPTIONS: HotkeyInterception[] = [
  { combo: 'Mod+Shift+L', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+Shift+L' },
  { combo: 'Mod+Shift+R', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+R' },
  { combo: 'Mod+Shift+E', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+E' },
  { combo: 'Mod+Shift+C', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+Shift+C' },
  { combo: 'Mod+Shift+I', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+I' },
  { combo: 'Mod+Shift+J', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+J' },
  { combo: 'Mod+Shift+S', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+S' },
  { combo: 'Mod+Shift+O', source: AMD, platforms: ['windows'], alternative: 'Mod+Alt+O' },
  { combo: 'Mod+Shift+F', source: 'Microsoft Pinyin', platforms: ['windows'], alternative: 'Mod+Alt+F' },
];

export interface InterceptedBinding {
  action: KeyActionDef;
  combo: KeyCombo;
  source: string;
  alternative: KeyCombo;
}

/**
 * Which bindings *currently in effect* are intercepted on this platform.
 *
 * Reads the effective chords, so a user who already moved a command off the
 * clashing key is not told about it again, and the preset has nothing left to
 * do for them. An alternative already taken by something else is dropped
 * rather than offered — the preset must never create a conflict of its own.
 */
export function interceptedBindings(
  overrides: Record<string, string | null | undefined> = {},
  platform: 'mac' | 'windows' | 'linux' = currentPlatform(),
): InterceptedBinding[] {
  // Resolved here rather than via `combosFor`, which looks actions up against
  // the *running* platform — that would read the wrong table whenever a
  // caller (a test, mostly) pins a different one.
  const effective = (action: KeyActionDef): KeyCombo[] => {
    const override = overrides[action.id];
    if (override === null) return [];
    return override ? [normalizeCombo(override)] : action.defaults.map(normalizeCombo);
  };
  const actions = activeKeyActions(platform);
  const taken = new Map<KeyCombo, string>();
  for (const action of actions) {
    for (const combo of effective(action)) taken.set(combo, action.id);
  }
  const out: InterceptedBinding[] = [];
  for (const action of actions) {
    for (const combo of effective(action)) {
      const hit = HOTKEY_INTERCEPTIONS.find(
        (h) => normalizeCombo(h.combo) === combo && h.platforms.includes(platform),
      );
      if (!hit) continue;
      const alternative = normalizeCombo(hit.alternative);
      const owner = taken.get(alternative);
      if (owner && owner !== action.id) continue;
      out.push({ action, combo, source: hit.source, alternative });
    }
  }
  return out;
}

/**
 * The "writer" preset: Mod+B is bold, as in Typora, Word and every rich-text
 * box on the web, and the file tree moves to where bold was. It is a swap, so
 * it can never leave either command without a key or create a conflict.
 */
export const WRITER_PRESET: Record<string, KeyCombo> = {
  'fmt.bold': 'Mod+B',
  'view.toggleFileTree': 'Mod+Shift+B',
};

/** True when both halves of the swap are in effect (however they got there). */
export function writerPresetActive(
  overrides: Record<string, string | null | undefined> = {},
): boolean {
  return Object.entries(WRITER_PRESET).every(([id, combo]) => {
    const now = combosFor(id, overrides);
    return now.length === 1 && now[0] === normalizeCombo(combo);
  });
}

/**
 * Search over the bindable actions — by name (in the UI language *and* in
 * English, so "bold" finds 加粗), by id, or by the chord itself ("⌘B",
 * "ctrl shift k"). One implementation for the help sheet and the settings
 * list, so the two can never disagree about what a query matches.
 */
export function filterKeyActions(
  actions: KeyActionDef[],
  query: string,
  localizedLabel: (a: KeyActionDef) => string,
  overrides: Record<string, string | null | undefined> = {},
  mac = false,
): KeyActionDef[] {
  const words = query.trim().toLowerCase().split(/[\s+]+/).filter(Boolean);
  if (!words.length) return actions;

  // "ctrl shift k" is a chord, not three words: as text, the lone "k" would
  // match strike, backslash and everything else with a k in it. When the query
  // names a modifier, compare it to the bindings part by part instead.
  const MODS: Record<string, string> = {
    ctrl: 'Mod', control: 'Mod', cmd: 'Mod', command: 'Mod', mod: 'Mod', '⌘': 'Mod', '⌃': 'Mod',
    alt: 'Alt', option: 'Alt', opt: 'Alt', '⌥': 'Alt',
    shift: 'Shift', '⇧': 'Shift',
  };
  // "⌘⇧k" typed without spaces still means three parts.
  const parts = words.flatMap((w) => w.split(/(?=[⌘⌃⌥⇧])|(?<=[⌘⌃⌥⇧])/)).filter(Boolean);
  const wantMods = new Set(parts.filter((w) => MODS[w]).map((w) => MODS[w]));
  const keys = parts.filter((w) => !MODS[w]);
  if (wantMods.size && keys.length <= 1) {
    return actions.filter((a) =>
      combosFor(a.id, overrides).some((c) => {
        const cp = c.split('+');
        const key = cp[cp.length - 1].toLowerCase();
        const mods = new Set(cp.slice(0, -1));
        if (mods.size !== wantMods.size || [...wantMods].some((m) => !mods.has(m))) return false;
        if (!keys.length) return true;
        return key === keys[0] || (PUNCT_BY_CODE[cp[cp.length - 1]] ?? '') === keys[0];
      }),
    );
  }

  return actions.filter((a) => {
    const combos = combosFor(a.id, overrides);
    const hay = [
      localizedLabel(a),
      a.label,
      a.id,
      ...combos,
      ...combos.map((c) => formatCombo(c, mac)),
      // "ctrl" / "cmd" are what people type; the table says "Mod".
      combos.some((c) => c.includes('Mod')) ? 'ctrl cmd command control' : '',
      combos.some((c) => c.includes('Alt')) ? 'option opt' : '',
    ].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Which other action already owns this chord, if any. */
export function conflictFor(
  combo: KeyCombo,
  actionId: string,
  overrides: Record<string, string | null | undefined> = {},
): string | null {
  const target = normalizeCombo(combo);
  for (const action of activeKeyActions()) {
    if (action.id === actionId) continue;
    if (combosFor(action.id, overrides).includes(target)) return action.id;
  }
  return null;
}

/**
 * Menu-item id → Tauri accelerator, for the native menu (#180).
 *
 * An empty string means "strip the accelerator": the action moved to a chord
 * the webview handles, so leaving the old one on the menu would keep firing
 * it and a rebind would only ever *add* a shortcut. Only ids the menu
 * actually carries appear here; `set_menu_config` keeps its built-in default
 * for anything absent.
 */
export function nativeMenuAccelerators(
  overrides: Record<string, string | null | undefined> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [actionId, menuId] of Object.entries(MENU_ITEM_BY_ACTION)) {
    if (!Object.prototype.hasOwnProperty.call(overrides, actionId)) continue;
    const combos = combosFor(actionId, overrides);
    out[menuId] = combos.length ? toTauriAccelerator(combos[0]) : '';
  }
  return out;
}

/** Menu items whose accelerator mirrors a rebindable action. */
const MENU_ITEM_BY_ACTION: Record<string, string> = {
  'file.new': 'file.new',
  'file.newText': 'file.newText',
  'file.open': 'file.open',
  'file.import': 'file.import',
  'file.save': 'file.save',
  'file.saveAs': 'file.saveAs',
  'file.closeTab': 'file.closeTab',
  'file.openExternal': 'file.openExternal',
  'window.new': 'window.new',
  'file.exit': 'file.exit',
  'export.pdfPrint': 'file.print',
  'view.toggleFileTree': 'view.toggleFileTree',
  'view.toggleRightSidebar': 'view.toggleRightSidebar',
  'view.toggleOutline': 'view.toggleOutline',
  'view.cycleView': 'view.cycleView',
  'search.global': 'search.global',
  'settings.open': 'app.settings',
  'help.markdown': 'help.markdown',
};

/** `Mod+Shift+K` → `CmdOrCtrl+Shift+K` (Tauri's accelerator grammar). */
export function toTauriAccelerator(combo: KeyCombo): string {
  const parts = combo.split('+');
  const key = parts.pop() ?? '';
  const out: string[] = [];
  if (parts.includes('Mod')) out.push('CmdOrCtrl');
  if (parts.includes('Alt')) out.push('Alt');
  if (parts.includes('Shift')) out.push('Shift');
  const named: Record<string, string> = {
    Comma: 'Comma', Slash: 'Slash', BracketLeft: 'BracketLeft', BracketRight: 'BracketRight',
    Backslash: 'Backslash', Minus: 'Minus', Equal: 'Equal', Semicolon: 'Semicolon',
    Quote: 'Quote', Period: 'Period', Backquote: 'Backquote',
  };
  out.push(named[key] ?? key);
  return out.join('+');
}

/** Formatted primary chord for a UI label, or '' when the action is unbound. */
export function shortcutLabel(
  actionId: string,
  overrides: Record<string, string | null | undefined> = {},
  isMac = false,
): string {
  const combos = combosFor(actionId, overrides);
  return combos.length ? formatCombo(combos[0], isMac) : '';
}

/**
 * `Mod+Shift+K` → `Mod-Shift-k`, CodeMirror's keymap spelling. Used for the
 * one editor-level chord that is user-bindable (AI rewrite); the popup
 * navigation keys stay hard-wired because they only mean anything while a
 * popup is open.
 */
export function toCodeMirrorKey(combo: KeyCombo): string {
  const parts = combo.split('+');
  const key = parts.pop() ?? '';
  const out: string[] = [];
  if (parts.includes('Mod')) out.push('Mod');
  if (parts.includes('Alt')) out.push('Alt');
  if (parts.includes('Shift')) out.push('Shift');
  const punct: Record<string, string> = {
    Comma: ',', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Minus: '-', Equal: '=', Semicolon: ';', Quote: "'", Period: '.', Backquote: '`',
  };
  out.push(punct[key] ?? (key.length === 1 ? key.toLowerCase() : key));
  return out.join('-');
}
