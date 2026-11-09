import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createApp } from '../lib/app.mjs';
const assets = {};
for (const [path, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8'], ['/styles.css', 'styles.css', 'text/css; charset=utf-8']]) {
  assets[path] = { body: await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8'), type };
}
const app = createApp({ assets });
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
createServer(async (incoming, outgoing) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    const request = new Request(`http://${incoming.headers.host || `localhost:${port}`}${incoming.url}`, {
      method: incoming.method, headers,
      ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: incoming, duplex: 'half' } : {}),
    });
    const response = await app.fetch(request, process.env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500, { 'Content-Type': 'text/plain' }); outgoing.end('Request failed.'); }
}).listen(port, host, () => console.log(`ClearCart at http://${host}:${port} (PayPal sandbox only)`));
