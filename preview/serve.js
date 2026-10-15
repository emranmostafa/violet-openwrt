// Live preview server for the Violet theme.
//
//   node preview/serve.js [port]
//
// Serves the project folder, rebuilds preview/modules.js and reloads open
// preview tabs automatically whenever a theme or preview file changes.
const http = require('http'), fs = require('fs'), path = require('path');
const { build } = require('./build');

const root = path.resolve(__dirname, '..');
const port = +process.argv[2] || 8765;
const types = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

const clients = new Set();

http.createServer((req, res) => {
	let url = decodeURIComponent(req.url.split('?')[0]);

	/* Server-sent events: tells open pages to reload */
	if (url == '/__live') {
		res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
		res.write('retry: 1000\n\n');
		clients.add(res);
		req.on('close', () => clients.delete(res));
		return;
	}

	if (url == '/')
		url = '/preview/';

	if (url.endsWith('/'))
		url += 'index.html';

	const file = path.join(root, url);
	if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }

	fs.readFile(file, (err, data) => {
		if (err) { res.writeHead(404); return res.end('not found: ' + url); }
		res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
		res.end(data);
	});
}).on('error', (err) => {
	if (err.code == 'EADDRINUSE')
		console.error(`Port ${port} is already in use. Close the other preview server or run: node preview/serve.js 8766`);
	else
		console.error(err);
	process.exit(1);
}).listen(port, () => {
	console.log(`Live preview running (Ctrl+C to stop):`);
	console.log(`  Overview       http://localhost:${port}/preview/`);
	console.log(`  Settings form  http://localhost:${port}/preview/form.html`);
	console.log(`  Login          http://localhost:${port}/preview/login.html`);
	console.log(`  Add ?mode=light to any page for the light variant.`);
	console.log(`Pages reload automatically when you edit files in luci-theme-violet/ or preview/.`);
});

/* Watch for changes, rebuild the module bundle, reload browsers */
build();

let timer = null;
function changed(dir, file) {
	if (!file || /modules\.js$/.test(file))
		return;

	clearTimeout(timer);
	timer = setTimeout(() => {
		try { build(); } catch (e) { console.error('bundle failed:', e.message); }
		console.log(`changed: ${path.join(dir, file)} -> reloading ${clients.size} tab(s)`);
		for (const res of clients)
			res.write('data: reload\n\n');
	}, 120);
}

for (const dir of [ 'luci-theme-violet', 'preview' ]) {
	try {
		fs.watch(path.join(root, dir), { recursive: true }, (ev, file) => changed(dir, file));
	} catch (e) {
		console.warn(`Not watching ${dir}: ${e.message}`);
	}
}
