import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
// Run each file directly so the managed runner reports individual test cases.
const files = (await readdir('tests')).filter(name => name.endsWith('.test.mjs')).sort();
for (const name of files) {
  const result = spawnSync(process.execPath, [`tests/${name}`], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log(`All ${files.length} test files passed.`);
