'use strict';
'require baseclass';
'require rpc';
'require fs';
'require network';

/*
 * LuCI Violet theme - connected WiFi and LAN (wired) clients with their
 * assigned addresses, shown on Status > Overview right after the speed cards.
 * Licensed to the public under the Apache License 2.0.
 *
 * WiFi clients come from the access point association lists. Wired clients
 * are the reachable entries of the kernel ARP table (/proc/net/arp) that are
 * not WiFi clients; if the ARP table cannot be read, active DHCP leases are
 * used instead.
 */

const callDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});

/* Only shown while the Violet theme is active; other themes keep the stock Overview */
const THEME_ACTIVE = /\/violet\/?$/.test(L.env.media || '');

const ICONS = {
	wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.3a10 10 0 0 1 14 0M8.5 15.8a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
	lan: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-2.5h14V17"/>'
};

function icon(name) {
	const span = E('span', { 'style': 'display:inline-flex' });
	span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
	return span.firstChild;
}

function normMAC(mac) {
	return String(mac || '').toUpperCase();
}

function ipSortKey(ip) {
	const m = String(ip || '').match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	return m ? ((+m[1] * 256 + +m[2]) * 256 + +m[3]) * 256 + +m[4] : Infinity;
}

function bandOf(freq) {
	const f = parseFloat(freq);

	if (isNaN(f))
		return null;

	return (f >= 5.925) ? '6g' : ((f >= 4.9) ? '5g' : '2g');
}

const BAND_LABEL = { '2g': '2.4 GHz', '5g': '5 GHz', '6g': '6 GHz' };

function rate(kbit) {
	if (!kbit)
		return '—';

	const mbit = kbit / 1000;
	return mbit >= 10 ? mbit.toFixed(0) : mbit.toFixed(1);
}

function signalBars(signal, noise) {
	if (!signal || signal == -256)
		return E('span', { 'class': 'vl-fg-faint' }, '—');

	const q = Math.min((signal + 110) / 70 * 100, 100);
	const level = q < 25 ? 1 : (q < 50 ? 2 : (q < 75 ? 3 : 4));
	const title = noise ? '%s: %d dBm / %s: %d dBm (SNR %d)'.format(_('Signal'), signal, _('Noise'), noise, signal - noise)
	                    : '%s: %d dBm'.format(_('Signal'), signal);

	return E('span', { 'class': 'vl-signal', 'title': title }, [
		E('span', { 'class': 'vl-bars q' + level }, [ E('i'), E('i'), E('i'), E('i') ]),
		'%d dBm'.format(signal)
	]);
}

return baseclass.extend({
	title: _('Connected Devices'),

	load() {
		if (!THEME_ACTIVE)
			return Promise.resolve(null);

		return Promise.all([
			network.getWifiNetworks(),
			network.getHostHints(),
			L.resolveDefault(callDHCPLeases(), {}),
			L.resolveDefault(fs.read('/proc/net/arp'), null),
			network.getWANNetworks()
		]).then(([ wifis, hints, leases, arp, wans ]) => {
			const aps = wifis.filter(net => net.getActiveMode() != 'Client');

			return Promise.all(aps.map(net => L.resolveDefault(net.getAssocList(), []))).then(lists => ({
				aps: aps, lists: lists, hints: hints, leases: leases || {}, arp: arp, wans: wans
			}));
		});
	},

	render(data) {
		if (!THEME_ACTIVE || !data)
			return null;

		const hints = data.hints;
		const leases4 = {}, leases6 = {};

		(data.leases.dhcp_leases || []).forEach(l => { leases4[normMAC(l.macaddr)] = l; });
		(data.leases.dhcp6_leases || []).forEach(l => { if (l.macaddr) leases6[normMAC(l.macaddr)] = l; });

		const nameOf = mac => hints.getHostnameByMACAddr(mac) || leases4[mac]?.hostname || null;
		const ip4Of = mac => hints.getIPAddrByMACAddr(mac) || leases4[mac]?.ipaddr || null;
		const ip6Of = mac => hints.getIP6AddrByMACAddr(mac) ||
			(leases6[mac]?.ip6addrs?.[0] || leases6[mac]?.ip6addr || '').replace(/\/\d+$/, '') || null;

		/* ----- WiFi clients ----- */

		const wifiMACs = {};
		const wifi = [];

		data.aps.forEach((net, i) => {
			const band = bandOf(net.getFrequency());

			(data.lists[i] || []).forEach(bss => {
				const mac = normMAC(bss.mac);

				wifiMACs[mac] = true;
				wifi.push({
					mac: mac,
					name: nameOf(mac),
					ip4: ip4Of(mac),
					ip6: ip6Of(mac),
					ssid: net.getActiveSSID() || '?',
					band: band,
					signal: bss.signal,
					noise: bss.noise,
					rx: bss.rx?.rate,
					tx: bss.tx?.rate,
					connected: bss.connected_time
				});
			});
		});

		/* ----- Wired (LAN) clients ----- */

		const wanDevs = data.wans.map(net => (net.getL3Device() || net.getDevice())?.getName()).filter(Boolean);
		const lan = [];
		const seen = {};

		const addLan = (mac, ip, dev) => {
			if (wifiMACs[mac])
				return;

			if (seen[mac]) {
				if (ip && !seen[mac].ip4)
					seen[mac].ip4 = ip;
				return;
			}

			seen[mac] = {
				mac: mac,
				name: nameOf(mac),
				ip4: ip || ip4Of(mac),
				ip6: ip6Of(mac),
				dev: dev,
				lease: leases4[mac]
			};

			lan.push(seen[mac]);
		};

		if (data.arp != null) {
			String(data.arp).trim().split(/\n/).slice(1).forEach(line => {
				/* IP address, HW type, Flags, HW address, Mask, Device */
				const f = line.trim().split(/\s+/);

				if (f.length < 6 || !(parseInt(f[2], 16) & 2) || f[3] == '00:00:00:00:00:00' || wanDevs.indexOf(f[5]) > -1)
					return;

				addLan(normMAC(f[3]), f[0], f[5]);
			});
		}
		else {
			(data.leases.dhcp_leases || []).forEach(l => addLan(normMAC(l.macaddr), l.ipaddr, null));
		}

		const byName = (a, b) => (ipSortKey(a.ip4) - ipSortKey(b.ip4)) || String(a.name || '~').localeCompare(String(b.name || '~'));
		wifi.sort(byName);
		lan.sort(byName);

		return E('div', { 'class': 'vl-clients' }, [
			this.renderHead('wifi', _('WiFi clients'), wifi.length),
			wifi.length ? this.renderWifi(wifi) : E('div', { 'class': 'vl-none' }, _('No wireless clients connected')),
			this.renderHead('lan', _('LAN clients'), lan.length),
			lan.length ? this.renderLan(lan) : E('div', { 'class': 'vl-none' }, _('No wired clients found'))
		]);
	},

	renderHead(kind, title, count) {
		return E('div', { 'class': 'vl-dash-head ' + kind }, [
			icon(kind), title, E('span', { 'class': 'vl-count' }, String(count))
		]);
	},

	hostCell(c) {
		return E('div', { 'class': 'vl-host' }, [
			E('strong', {}, c.name || _('Unknown device')),
			E('small', {}, c.mac)
		]);
	},

	ipCell(c) {
		return E('div', {}, [
			E('span', { 'class': 'vl-ip' }, c.ip4 || '—'),
			c.ip6 ? E('span', { 'class': 'vl-ip6', 'title': c.ip6 }, c.ip6) : ''
		]);
	},

	renderWifi(rows) {
		const table = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Device')),
				E('th', { 'class': 'th' }, _('IP address')),
				E('th', { 'class': 'th' }, _('Network')),
				E('th', { 'class': 'th' }, _('Signal')),
				E('th', { 'class': 'th' }, _('Rate (Mbit/s)')),
				E('th', { 'class': 'th hide-xs' }, _('Connected'))
			])
		]);

		rows.forEach(c => {
			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'data-title': _('Device') }, this.hostCell(c)),
				E('td', { 'class': 'td', 'data-title': _('IP address') }, this.ipCell(c)),
				E('td', { 'class': 'td', 'data-title': _('Network') }, [
					c.band ? E('span', { 'class': 'vl-tag band-' + c.band }, BAND_LABEL[c.band]) : '',
					' ', E('span', {}, c.ssid)
				]),
				E('td', { 'class': 'td', 'data-title': _('Signal') }, signalBars(c.signal, c.noise)),
				E('td', { 'class': 'td', 'data-title': _('Rate (Mbit/s)') }, E('span', { 'class': 'vl-rate', 'title': _('Receive / Transmit') }, [
					E('span', { 'class': 'd' }, '↓ ' + rate(c.rx)), '  ',
					E('span', { 'class': 'u' }, '↑ ' + rate(c.tx))
				])),
				E('td', { 'class': 'td hide-xs', 'data-title': _('Connected') }, c.connected ? '%t'.format(c.connected) : '—')
			]));
		});

		return table;
	},

	renderLan(rows) {
		const table = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Device')),
				E('th', { 'class': 'th' }, _('IP address')),
				E('th', { 'class': 'th' }, _('Interface')),
				E('th', { 'class': 'th' }, _('Lease'))
			])
		]);

		rows.forEach(c => {
			let lease;

			if (!c.lease)
				lease = E('span', { 'class': 'vl-tag' }, _('Static'));
			else if (c.lease.expires > 0)
				lease = E('span', { 'title': _('Lease time remaining') }, '%t'.format(c.lease.expires));
			else
				lease = E('span', { 'class': 'vl-tag ok' }, _('Permanent'));

			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'data-title': _('Device') }, this.hostCell(c)),
				E('td', { 'class': 'td', 'data-title': _('IP address') }, this.ipCell(c)),
				E('td', { 'class': 'td', 'data-title': _('Interface') }, c.dev ? E('span', { 'class': 'vl-mono' }, c.dev) : '—'),
				E('td', { 'class': 'td', 'data-title': _('Lease') }, lease)
			]));
		});

		return table;
	}
});
