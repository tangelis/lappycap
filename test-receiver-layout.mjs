#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function run() {
  const html = await readFile(new URL('./receiver.html', import.meta.url), 'utf8');
  const receiverSource = await readFile(new URL('./src/receiver.ts', import.meta.url), 'utf8');

  assert.match(html, /id="receiver-overlay"/, 'receiver overlay container should exist');
  assert.match(html, /id="receiver-status"/, 'receiver status label should exist');
  assert.match(html, /id="receiver-title"/, 'receiver now-playing title should exist');
  assert.match(html, /id="receiver-meta"/, 'receiver meta line should exist');
  assert.match(html, /id="receiver-tip"/, 'receiver return hint should exist');
  assert.doesNotMatch(
    receiverSource,
    /onCastReady\(\): void \{[\s\S]*this\.startStandalone\(\);/,
    'receiver should wait for sender instead of auto-starting a default station in Cast mode',
  );

  console.log('test-receiver-layout: PASS');
}

run().catch((error) => {
  console.error('test-receiver-layout: FAIL');
  console.error(error);
  process.exitCode = 1;
});
