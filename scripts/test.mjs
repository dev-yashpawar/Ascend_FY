import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// A shared, project-local temp path keeps Vite worker modules accessible in Windows sandboxes.
const temp = resolve('.test-tmp');
mkdirSync(temp, { recursive: true });
const env = { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp };
for (const args of [
  ['node_modules/vitest/vitest.mjs', 'run'],
  ['--test', 'tests/backend.test.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
