#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const EXPECTED_ID = '97CE3127';
const FILES = [
  './src/cast-sender.ts',
  './remote.html',
  './android/app/src/main/java/com/lappycap/android/CastOptionsProvider.kt',
  './CASTING.md',
  './android/README.md',
];

async function run() {
  for (const file of FILES) {
    const contents = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.match(contents, new RegExp(EXPECTED_ID), `${file} should reference the new Cast app ID`);
    assert.doesNotMatch(contents, /8315CD49/, `${file} should no longer reference the old Cast app ID`);
  }

  console.log('test-cast-app-id: PASS');
}

run().catch((error) => {
  console.error('test-cast-app-id: FAIL');
  console.error(error);
  process.exitCode = 1;
});
