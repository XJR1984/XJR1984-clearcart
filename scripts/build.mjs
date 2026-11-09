import { build } from 'esbuild';
import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
const assets = {};
for (const [path, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8'], ['/styles.css', 'styles.css', 'text/css; charset=utf-8']]) {
  assets[path] = { body: await readFile(`public/${file}`, 'utf8'), type };
}
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await build({
  stdin: { contents: `import {createApp} from './lib/app.mjs'; export default createApp({assets:${JSON.stringify(assets)}});`, resolveDir: process.cwd(), sourcefile: 'worker-entry.mjs' },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: 'dist/server/index.js', minify: false,
});
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
// Use the exact deployment entrypoint in artifact smoke tests.
const worker = (await import(`../dist/server/index.js?v=${Date.now()}`)).default;
const health = await worker.fetch(new Request('https://clearcart.example/api/health'), {});
if (health.status !== 200 || (await health.json()).status !== 'ok') throw new Error('Worker smoke check failed.');
const page = await worker.fetch(new Request('https://clearcart.example/'), {});
if (page.status !== 200 || !(await page.text()).includes('ClearCart')) throw new Error('Built page is missing.');
console.log('Built and smoke-tested dist/server/index.js. No runtime dependencies.');
