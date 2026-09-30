import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldUsePlainWindowsEditor } from './platform.ts';

test('Windows standard mode uses the IME-safe textarea', () => {
  assert.equal(shouldUsePlainWindowsEditor(true, false), true);
});

test('Windows Vim mode uses CodeMirror', () => {
  assert.equal(shouldUsePlainWindowsEditor(true, true), false);
});

test('non-Windows platforms keep CodeMirror', () => {
  assert.equal(shouldUsePlainWindowsEditor(false, false), false);
});

test('Windows with the CodeMirror engine uses CodeMirror without Vim (#328)', () => {
  assert.equal(shouldUsePlainWindowsEditor(true, false, 'codemirror'), false);
});

test('Windows with the native engine keeps the textarea', () => {
  assert.equal(shouldUsePlainWindowsEditor(true, false, 'native'), true);
});

test('Vim still forces CodeMirror whatever the engine setting', () => {
  assert.equal(shouldUsePlainWindowsEditor(true, true, 'native'), false);
});

test('the engine setting is ignored off Windows', () => {
  assert.equal(shouldUsePlainWindowsEditor(false, false, 'native'), false);
});
