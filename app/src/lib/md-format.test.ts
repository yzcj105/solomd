import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyFormat, type FormatKind } from './md-format.ts';

/** `|` marks the selection ends (one `|` = a bare caret). */
function run(marked: string, kind: FormatKind): string {
  const first = marked.indexOf('|');
  const rest = marked.slice(first + 1);
  const second = rest.indexOf('|');
  const doc = second < 0 ? marked.replace('|', '') : marked.slice(0, first) + rest.replace('|', '');
  const from = first;
  const to = second < 0 ? first : first + second;
  const e = applyFormat(doc, from, to, kind);
  const out = doc.slice(0, e.from) + e.insert + doc.slice(e.to);
  return e.selFrom === e.selTo
    ? out.slice(0, e.selFrom) + '|' + out.slice(e.selFrom)
    : out.slice(0, e.selFrom) + '|' + out.slice(e.selFrom, e.selTo) + '|' + out.slice(e.selTo);
}

test('bold wraps a selection and comes back off', () => {
  assert.equal(run('a |word| b', 'bold'), 'a **|word|** b');
  assert.equal(run('a **|word|** b', 'bold'), 'a |word| b');
});

test('bold on a selection that includes its markers unwraps', () => {
  assert.equal(run('a |**word**| b', 'bold'), 'a |word| b');
});

test('a bare caret formats the word under it — but not a whole CJK clause', () => {
  assert.equal(run('hello wo|rld', 'bold'), 'hello **|world|**');
  assert.equal(run('这是重|点内容', 'bold'), '这是重**|**点内容');
  assert.equal(run('这是|重点|内容', 'bold'), '这是**|重点|**内容');
});

test('a bare caret with no word leaves the caret between the markers', () => {
  assert.equal(run('a | b', 'bold'), 'a **|** b');
  assert.equal(run('|', 'code'), '`|`');
});

test('italic and bold do not mistake each other', () => {
  assert.equal(run('**|word|**', 'italic'), '***|word|***');
  assert.equal(run('***|word|***', 'italic'), '**|word|**');
  assert.equal(run('***|word|***', 'bold'), '*|word|*');
  assert.equal(run('*|word|*', 'bold'), '***|word|***');
  assert.equal(run('*|word|*', 'italic'), '|word|');
});

test('strike and inline code toggle', () => {
  assert.equal(run('|x|', 'strike'), '~~|x|~~');
  assert.equal(run('~~|x|~~', 'strike'), '|x|');
  assert.equal(run('`|x|`', 'code'), '|x|');
});

test('link selects the url placeholder; a selected url becomes the target', () => {
  assert.equal(run('see |docs| now', 'link'), 'see [docs](|url|) now');
  assert.equal(run('|https://a.b/c|', 'link'), '[|](https://a.b/c)');
});

test('headings set, switch level, and toggle off', () => {
  assert.equal(run('Ti|tle', 'h2'), '## Title|');
  assert.equal(run('## Ti|tle', 'h3'), '### Title|');
  assert.equal(run('### Ti|tle', 'h3'), 'Title|');
});

test('heading only touches the caret line', () => {
  assert.equal(run('one\ntw|o\nthree', 'h1'), 'one\n# two|\nthree');
});

test('lists apply per line, number in order, skip blank lines, toggle off', () => {
  assert.equal(run('|a\nb|', 'ul'), '|- a\n- b|');
  assert.equal(run('|a\n\nb|', 'ol'), '|1. a\n\n2. b|');
  assert.equal(run('|- a\n- b|', 'ul'), '|a\nb|');
});

test('switching list type replaces the marker instead of stacking', () => {
  assert.equal(run('|- a\n- b|', 'ol'), '|1. a\n2. b|');
  assert.equal(run('|1. a|', 'task'), '|- [ ] a|');
  assert.equal(run('|- [x] a|', 'task'), '|a|');
  assert.equal(run('  |- a|', 'task'), '|  - [ ] a|');
});

test('a selection ending at a line start does not drag the next line in', () => {
  assert.equal(run('|a\n|b', 'quote'), '|> a|\nb');
});

test('quote toggles', () => {
  assert.equal(run('|> a\n> b|', 'quote'), '|a\nb|');
});

test('code block wraps whole lines and unwraps', () => {
  assert.equal(run('x\n|let a = 1;|\ny', 'codeblock'), 'x\n```|\nlet a = 1;\n```\ny');
  assert.equal(run('|```\nlet a = 1;\n```|', 'codeblock'), '|let a = 1;|');
});

test('#360: a heading on an empty first line of a multi-line document', () => {
  assert.equal(run('|\nsecond line', 'h1'), '# |\nsecond line');
  assert.equal(run('|\n\nthird', 'h2'), '## |\n\nthird');
  // the other lines the reporter checked keep working
  assert.equal(run('|', 'h1'), '# |');
  assert.equal(run('first\n|\nthird', 'h1'), 'first\n# |\nthird');
  assert.equal(run('|first\nsecond', 'h1'), '# first|\nsecond');
});

test('#360: list and quote prefixes on an empty first line too', () => {
  assert.equal(run('|\nsecond', 'ul'), '- |\nsecond');
  assert.equal(run('|\nsecond', 'quote'), '> |\nsecond');
});
