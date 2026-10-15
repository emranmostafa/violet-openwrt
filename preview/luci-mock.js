/*
 * Minimal stand-in for the LuCI JavaScript runtime so the real theme files
 * (menu-violet.js and the Overview dashboard includes) can run in a normal
 * browser with fake router data. Preview only - not installed on the router.
 */
(function() {
	'use strict';

	const RES = '../luci-theme-violet/htdocs/luci-static/resources/';

	/* ---------- helpers LuCI provides globally ---------- */

	window._ = (s) => s;

	window.E = function(tag, attr, data) {
		if (Array.isArray(tag)) {
			const frag = document.createDocumentFragment();
			tag.forEach(c => frag.appendChild(c instanceof Node ? c : document.createTextNode(c)));
			return frag;
		}

		const el = document.createElement(tag);

		if (attr != null && (typeof attr != 'object' || Array.isArray(attr) || attr instanceof Node)) {
			data = attr;
			attr = null;
		}

		for (const k in (attr || {})) {
			const v = attr[k];
			if (v == null) continue;
			if (typeof v == 'function') el.addEventListener(k, v);
			else el.setAttribute(k, v);
		}

		const append = (d) => {
			if (d == null || d === '') return;
			if (Array.isArray(d)) d.forEach(append);
			else if (d instanceof Node) el.appendChild(d);
			else el.appendChild(document.createTextNode(String(d)));
		};

		append(data);
		return el;
	};

	function fmtTime(t) {
		t = Math.floor(+t || 0);
		const d = Math.floor(t / 86400), h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60;
		return d ? `${d}d ${h}h ${m}m ${s}s` : (h ? `${h}h ${m}m ${s}s` : (m ? `${m}m ${s}s` : `${s}s`));
	}

	String.prototype.format = function() {
		const args = arguments;
		let i = 0;

		return this.replace(/%(\d+)?(?:\.(\d+))?([sdfhtmq%])/g, (all, pad, prec, type) => {
			if (type == '%') return '%';
			const v = args[i++];

			switch (type) {
			case 's': return String(v);
			case 'd': return String(Math.trunc(+v));
			case 'f': return (+v).toFixed(prec != null ? +prec : 6);
			case 'h': return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
			case 'q': return String(v);
			case 't': return fmtTime(v);
			case 'm': {
				const base = pad ? +pad : 1000, units = ['', 'K', 'M', 'G', 'T'];
				let n = +v, u = 0;
				while (n >= base && u < units.length - 1) { n /= base; u++; }
				return n.toFixed(prec != null ? +prec : 2) + ' ' + units[u] + (base == 1024 && u ? 'i' : '');
			}
			}
		});
	};

	/* ---------- fake router data ---------- */

	const HOSTS = {
		'3C:22:FB:10:AA:01': { name: 'Emrans-iPhone', ip: '192.168.1.143', ip6: 'fd4e:21a0:7c11::8a3' },
		'A4:83:E7:52:19:C2': { name: 'MacBook-Pro', ip: '192.168.1.120', ip6: 'fd4e:21a0:7c11::51' },
		'F0:18:98:3D:7E:44': { name: 'Galaxy-S24', ip: '192.168.1.167' },
		'B8:27:EB:0C:91:5A': { name: 'living-room-tv', ip: '192.168.1.112' },
		'64:16:66:A1:02:33': { name: 'Nest-Thermostat', ip: '192.168.1.181' },
		'DC:A6:32:7F:10:EE': { name: 'raspberrypi', ip: '192.168.1.20', ip6: 'fd4e:21a0:7c11::20' },
		'00:11:32:9C:44:01': { name: 'synology-nas', ip: '192.168.1.10' },
		'E4:5F:01:22:8B:7D': { name: 'gaming-pc', ip: '192.168.1.102', ip6: 'fd4e:21a0:7c11::66' },
		'52:54:00:12:34:56': { name: null, ip: '192.168.1.199' }
	};

	const WIFI = [
		{ ssid: 'Home-5G', freq: '5.180', ifname: 'phy1-ap0', clients: [
			{ mac: '3C:22:FB:10:AA:01', signal: -48, noise: -92, rx: { rate: 864700 }, tx: { rate: 1200900 }, connected_time: 9214 },
			{ mac: 'A4:83:E7:52:19:C2', signal: -57, noise: -92, rx: { rate: 576500 }, tx: { rate: 720600 }, connected_time: 30122 },
			{ mac: 'F0:18:98:3D:7E:44', signal: -66, noise: -92, rx: { rate: 286800 }, tx: { rate: 360300 }, connected_time: 1802 }
		] },
		{ ssid: 'Home', freq: '2.437', ifname: 'phy0-ap0', clients: [
			{ mac: 'B8:27:EB:0C:91:5A', signal: -61, noise: -95, rx: { rate: 72200 }, tx: { rate: 65000 }, connected_time: 88231 },
			{ mac: '64:16:66:A1:02:33', signal: -79, noise: -95, rx: { rate: 6500 }, tx: { rate: 11000 }, connected_time: 402331 }
		] }
	];

	const ARP = [
		'IP address       HW type     Flags       HW address            Mask     Device',
		'192.168.1.143    0x1         0x2         3c:22:fb:10:aa:01     *        br-lan',
		'192.168.1.120    0x1         0x2         a4:83:e7:52:19:c2     *        br-lan',
		'192.168.1.20     0x1         0x2         dc:a6:32:7f:10:ee     *        br-lan',
		'192.168.1.10     0x1         0x2         00:11:32:9c:44:01     *        br-lan',
		'192.168.1.102    0x1         0x2         e4:5f:01:22:8b:7d     *        br-lan',
		'192.168.1.199    0x1         0x2         52:54:00:12:34:56     *        br-lan',
		'192.168.1.150    0x1         0x0         00:00:00:00:00:00     *        br-lan',
		'100.72.0.1       0x1         0x2         00:1a:2b:3c:4d:5e     *        wan'
	].join('\n');

	const LEASES = {
		dhcp_leases: [
			{ hostname: 'Emrans-iPhone', ipaddr: '192.168.1.143', macaddr: '3c:22:fb:10:aa:01', expires: 39211 },
			{ hostname: 'MacBook-Pro', ipaddr: '192.168.1.120', macaddr: 'a4:83:e7:52:19:c2', expires: 21012 },
			{ hostname: 'raspberrypi', ipaddr: '192.168.1.20', macaddr: 'dc:a6:32:7f:10:ee', expires: false },
			{ hostname: 'gaming-pc', ipaddr: '192.168.1.102', macaddr: 'e4:5f:01:22:8b:7d', expires: 40211 },
			{ hostname: 'synology-nas', ipaddr: '192.168.1.10', macaddr: '00:11:32:9c:44:01', expires: 7300 }
		],
		dhcp6_leases: []
	};

	/* Simulated WAN byte counters */
	const counters = { rx: 81234567890, tx: 9123456789, t: Date.now() };
	function tick() {
		const now = Date.now(), dt = (now - counters.t) / 1000;
		counters.t = now;
		const phase = now / 9000;
		counters.rx += Math.max(0, (180 + 140 * Math.sin(phase) + Math.random() * 90) * 1e6 / 8 * dt);
		counters.tx += Math.max(0, (18 + 12 * Math.cos(phase * 1.3) + Math.random() * 8) * 1e6 / 8 * dt);
	}

	/* ---------- module mocks ---------- */

	const baseclass = {
		extend(props) {
			const C = function() { if (typeof this.__init__ == 'function') this.__init__.apply(this, arguments); };
			Object.assign(C.prototype, props);
			return C;
		}
	};

	const rpc = {
		declare(spec) {
			return function() {
				if (spec.method == 'getNetworkDevices') {
					tick();
					return Promise.resolve({ wan: { stats: { rx_bytes: Math.round(counters.rx), tx_bytes: Math.round(counters.tx) } } });
				}
				if (spec.method == 'getDHCPLeases')
					return Promise.resolve(LEASES);
				return Promise.resolve({});
			};
		}
	};

	const device = { getName: () => 'wan' };
	const network = {
		getWANNetworks: () => Promise.resolve([{
			getName: () => 'wan', getI18n: () => 'DHCP client', getIPAddr: () => '100.72.14.203',
			getGatewayAddr: () => '100.72.0.1', getUptime: () => 5972 + Math.floor(performance.now() / 1000),
			getL3Device: () => device, getDevice: () => device
		}]),
		getWifiNetworks: () => Promise.resolve(WIFI.map(w => ({
			getActiveMode: () => 'Master', getActiveSSID: () => w.ssid, getFrequency: () => w.freq,
			getIfname: () => w.ifname, getAssocList: () => Promise.resolve(w.clients.map(c => Object.assign({}, c)))
		}))),
		getHostHints: () => Promise.resolve({
			getHostnameByMACAddr: m => HOSTS[m]?.name || null,
			getIPAddrByMACAddr: m => HOSTS[m]?.ip || null,
			getIP6AddrByMACAddr: m => HOSTS[m]?.ip6 || null
		}),
		flushCache: () => Promise.resolve()
	};

	const fs = {
		read: (path) => path == '/proc/net/arp' ? Promise.resolve(ARP) : Promise.reject(new Error('denied'))
	};

	const poll = { add: (fn, interval) => setInterval(fn, (interval || 5) * 1000) };

	const MENU = {
		children: { admin: { title: 'Administration', order: 10, children: {
			status: { title: 'Status', order: 10, children: {
				overview: { title: 'Overview', order: 1 }, routes: { title: 'Routing', order: 2 },
				nftables: { title: 'Firewall', order: 3 }, syslog: { title: 'System Log', order: 4 },
				processes: { title: 'Processes', order: 6 }, channel_analysis: { title: 'Channel Analysis', order: 7 },
				realtime: { title: 'Realtime Graphs', order: 8 } } },
			system: { title: 'System', order: 20, children: {
				system: { title: 'System', order: 1 }, admin: { title: 'Administration', order: 2, children: {
					password: { title: 'Router Password', order: 1 }, dropbear: { title: 'SSH Access', order: 2 },
					sshkeys: { title: 'SSH-Keys', order: 3 }, uhttpd: { title: 'HTTP(S) Access', order: 4 } } },
				'package-manager': { title: 'Software', order: 3 }, startup: { title: 'Startup', order: 4 },
				crontab: { title: 'Scheduled Tasks', order: 5 }, mounts: { title: 'Mount Points', order: 6 },
				leds: { title: 'LED Configuration', order: 7 }, flash: { title: 'Backup / Flash Firmware', order: 8 },
				reboot: { title: 'Reboot', order: 9 } } },
			services: { title: 'Services', order: 40, children: {
				ttyd: { title: 'Terminal', order: 1 }, upnp: { title: 'UPnP IGD & PCP', order: 2 } } },
			network: { title: 'Network', order: 50, children: {
				network: { title: 'Interfaces', order: 1 }, wireless: { title: 'Wireless', order: 2 },
				routes: { title: 'Routing', order: 3 }, dhcp: { title: 'DHCP and DNS', order: 4 },
				diagnostics: { title: 'Diagnostics', order: 5 }, firewall: { title: 'Firewall', order: 6 } } },
			logout: { title: 'Log out', order: 999 }
		} } }
	};

	const ui = {
		menu: {
			load: () => Promise.resolve(MENU),
			getChildren: (node) => Object.keys(node?.children || {})
				.map(k => Object.assign({ name: k }, node.children[k]))
				.sort((a, b) => (a.order || 0) - (b.order || 0))
		}
	};

	const MODULES = { baseclass, rpc, network, fs, poll, ui };

	/* ---------- L ---------- */

	const path = (document.body.getAttribute('data-page') || 'admin-status-overview').split('-');

	window.L = {
		env: { dispatchpath: path, requestpath: path, pollinterval: 5, media: '/luci-static/violet' },
		url: (...args) => '#/' + args.join('/'),
		resource: (p) => RES + p,
		bind: (fn, self, ...a) => fn.bind(self, ...a),
		resolveDefault: (p, d) => Promise.resolve(p).catch(() => d),
		hasSystemFeature: () => true,
		toArray: (x) => Array.isArray(x) ? x : (x == null ? [] : [ x ]),

		require(name) {
			return loadSource(name).then(src => {
				const deps = [];
				src.replace(/^\s*'require\s+([\w.-]+)(?:\s+as\s+(\w+))?';/gm, (m, mod, alias) => {
					deps.push([ alias || mod.split('.').pop(), MODULES[mod] ]);
				});
				const factory = new Function(...deps.map(d => d[0]), src);
				const Cls = factory(...deps.map(d => d[1]));
				return new Cls();
			});
		}
	};

	/*
	 * Over http(s) the theme files are fetched directly, so edits show up on
	 * reload. Opened from disk (file://) browsers block fetch(), so the copy
	 * bundled in modules.js (made by build.js / serve.js) is used instead.
	 */
	function loadSource(name) {
		const bundled = window.VL_MODULES && window.VL_MODULES[name];
		const fromBundle = () => {
			if (bundled != null)
				return bundled;
			throw new Error('Module "' + name + '" is not in preview/modules.js. Run: node preview/build.js');
		};

		if (!/^https?:$/.test(location.protocol))
			return Promise.resolve().then(fromBundle);

		return fetch(RES + name.replace(/\./g, '/') + '.js', { cache: 'no-store' })
			.then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
			.catch(fromBundle);
	}

	/* Live reload when served by preview/serve.js (ignored by other servers; add ?nolive to disable) */
	if (/^https?:$/.test(location.protocol) && window.EventSource && !/[?&]nolive/.test(location.search)) {
		const live = new EventSource('/__live');
		live.onmessage = (ev) => { if (ev.data == 'reload') location.reload(); };
	}
})();
