import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Serve the production artifact under the same subdirectory used by GitHub Pages.
const root = resolve('dist-pages');
const prefix = '/open-world-portfolio/';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.woff2':'font/woff2', '.ttf':'font/ttf', '.json':'application/json' };
createServer(async (request,response) => {
    try {
        const url = new URL(request.url,'http://127.0.0.1');
        if(url.pathname === '/') { response.writeHead(302,{Location:prefix}); response.end(); return }
        if(!url.pathname.startsWith(prefix)) { response.writeHead(404); response.end(); return }
        const name = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
        const target = resolve(root, name);
        if(!target.startsWith(root+sep)) { response.writeHead(403); response.end(); return }
        const info = await stat(target);
        if(!info.isFile()) { response.writeHead(404); response.end(); return }
        response.writeHead(200,{'Content-Type':types[extname(target)] || 'application/octet-stream','X-Content-Type-Options':'nosniff'});
        response.end(await readFile(target));
    } catch { response.writeHead(404); response.end('Not found') }
}).listen(5177,'127.0.0.1',()=>console.log('Production preview: http://127.0.0.1:5177/open-world-portfolio/'));
