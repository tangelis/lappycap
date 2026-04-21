#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
    child.on('error', reject);
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const root = await mkdtemp(join(tmpdir(), 'lappycap-layout-'));
  const dist = join(root, 'dist');
  await mkdir(join(dist, 'assets'), { recursive: true });

  await writeFile(join(dist, 'index.html'), '<script src="/lappycap/assets/main.js"></script>');
  await writeFile(join(dist, 'receiver.html'), '<html>receiver</html>');
  await writeFile(join(dist, 'remote.html'), '<html>remote</html>');
  await writeFile(join(dist, 'manifest.json'), '{"name":"LappyCap"}');
  await writeFile(join(dist, 'assets', 'main.js'), 'console.log("ok")');

  await runCommand('bash', [
    '/home/tangel/src/lappycap/scripts/nest-vite-dist-for-here.sh',
    dist,
    'lappycap',
  ]);

  assert.equal(await exists(join(dist, 'index.html')), true, 'root index should remain for slug hosting');
  assert.equal(await exists(join(dist, 'lappycap', 'index.html')), true, 'nested index should exist for mounted subpath hosting');
  assert.equal(await exists(join(dist, 'lappycap', 'assets', 'main.js')), true, 'nested assets should exist');
  assert.equal(await exists(join(dist, 'lappycap', 'receiver.html')), true, 'other app entrypoints should be nested too');
  assert.equal(
    await readFile(join(dist, 'lappycap', 'index.html'), 'utf8'),
    await readFile(join(dist, 'index.html'), 'utf8'),
    'nested index should match root index',
  );

  console.log('test-publish-layout: PASS');
}

run().catch((error) => {
  console.error('test-publish-layout: FAIL');
  console.error(error);
  process.exitCode = 1;
});
