'use strict';
'require baseclass';
'require rpc';
'require network';
'require poll';

/*
 * LuCI Violet theme - live internet (WAN) download / upload speed,
 * shown first on Status > Overview.
 * Licensed to the public under the Apache License 2.0.
 */

const callNetworkDevices = rpc.declare({
	object: 'luci-rpc',
	method: 'getNetworkDevices',
	expect: { '': {} }
});

/* Only shown while the Violet theme is active; other themes keep the stock Overview */
const THEME_ACTIVE = /\/violet\/?$/.test(L.env.media || '');

const INTERVAL = 2;   // seconds between samples
const HISTORY = 60;   // samples kept for the sparkline (2 minutes)

const ICONS = {
	down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
	up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
	globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>'
};

function icon(name) {
	const span = E('span', { 'style': 'display:inline-flex' });
	span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
	return span.firstChild;
}

function formatRate(bps) {
	if (bps == null || isNaN(bps))
		return [ '—', '' ];

	const units = [ 'bit/s', 'Kbit/s', 'Mbit/s', 'Gbit/s' ];
	let i = 0;

	while (bps >= 1000 && i < units.length - 1) {
		bps /= 1000;
		i++;
	}

	const digits = (i == 0 || bps >= 100) ? 0 : (bps >= 10 ? 1 : 2);
	return [ bps.toFixed(digits), units[i] ];
}

function formatBytes(bytes) {
	return '%1024.2mB'.format(bytes || 0);
}

function sparkline(values) {
	const w = 300, h = 46;
	const n = values.length;

	if (n < 2)
		return '';

	const max = Math.max.apply(null, values.concat([ 1 ])) * 1.2;
	/* spread the first samples over the card, then scroll once HISTORY is reached */
	const step = w / Math.max(n - 1, 10);
	const x0 = w - (n - 1) * step;
	const pts = values.map((v, i) => [ x0 + i * step, h - (v / max) * (h - 4) - 1 ]);
	const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
	const area = line + 'L' + w + ',' + h + 'L' + x0.toFixed(1) + ',' + h + 'Z';

	return '<svg class="vl-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
		'<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/></svg>';
}

return baseclass.extend({
	title: _('Internet Speed'),

	__init__() {
		this.devs = [];
		this.wans = [];
		this.rx = [];
		this.tx = [];
		this.prev = null;
		this.totals = null;
		this.node = null;
		this.polling = false;
	},

	load() {
		if (!THEME_ACTIVE)
			return Promise.resolve(null);

		return network.getWANNetworks().then((nets) => {
			const devs = [];

			const wans = nets.map((net) => {
				const dev = net.getL3Device() || net.getDevice();
				const name = dev ? dev.getName() : null;

				if (name && devs.indexOf(name) < 0)
					devs.push(name);

				return {
					name: net.getName(),
					proto: net.getI18n(),
					ipaddr: net.getIPAddr(),
					gateway: net.getGatewayAddr(),
					uptime: net.getUptime(),
					device: name
				};
			});

			this.devs = devs;

			return wans;
		});
	},

	render(wans) {
		if (!THEME_ACTIVE)
			return null;

		this.wans = wans || [];

		if (!this.node)
			this.build();

		if (!this.polling) {
			this.polling = true;
			this.sample().then(() => window.setTimeout(() => this.sample(), 1000));
			poll.add(() => this.sample(), INTERVAL);
		}

		this.paint();

		return this.node;
	},

	build() {
		const card = (cls, iconName, label) => {
			const el = {
				root: E('div', { 'class': 'vl-stat ' + cls }),
				value: E('div', { 'class': 'vl-stat-value' }, '—'),
				sub: E('div', { 'class': 'vl-stat-sub' }, ' '),
				spark: E('div')
			};

			el.root.appendChild(E('div', { 'class': 'vl-stat-label' }, [ icon(iconName), label ]));
			el.root.appendChild(el.value);
			el.root.appendChild(el.sub);
			el.root.appendChild(el.spark);

			return el;
		};

		this.cards = {
			down: card('is-down', 'down', _('Download')),
			up: card('is-up', 'up', _('Upload')),
			wan: card('is-wan', 'globe', _('Internet'))
		};

		this.node = E('div', { 'class': 'vl-stats' }, [
			this.cards.down.root,
			this.cards.up.root,
			this.cards.wan.root
		]);
	},

	push(list, value) {
		list.push(value);

		while (list.length > HISTORY)
			list.shift();
	},

	sample() {
		if (!this.devs.length) {
			this.prev = null;
			this.totals = null;
			this.paint();
			return Promise.resolve();
		}

		return L.resolveDefault(callNetworkDevices(), {}).then((devices) => {
			const key = this.devs.join(',');
			let rx = 0, tx = 0, found = false;

			this.devs.forEach((name) => {
				const stats = devices?.[name]?.stats;

				if (stats) {
					rx += +stats.rx_bytes || 0;
					tx += +stats.tx_bytes || 0;
					found = true;
				}
			});

			const now = Date.now();

			if (found && this.prev && this.prev.key == key) {
				const dt = (now - this.prev.t) / 1000;
				const drx = rx - this.prev.rx;
				const dtx = tx - this.prev.tx;

				/* ignore counter resets and too-close samples */
				if (dt > 0.3 && drx >= 0 && dtx >= 0) {
					this.push(this.rx, drx * 8 / dt);
					this.push(this.tx, dtx * 8 / dt);
				}
			}

			this.prev = found ? { rx: rx, tx: tx, t: now, key: key } : null;
			this.totals = found ? { rx: rx, tx: tx } : null;
			this.paint();
		});
	},

	paintRate(card, list, total) {
		const current = list.length ? list[list.length - 1] : null;
		const peak = list.length ? Math.max.apply(null, list) : null;
		const [ value, unit ] = formatRate(this.devs.length ? current : null);

		card.value.textContent = value;
		if (unit)
			card.value.appendChild(E('small', {}, unit));

		if (!this.devs.length)
			card.sub.textContent = _('No internet connection');
		else if (current == null)
			card.sub.textContent = _('Measuring…');
		else
			card.sub.innerHTML = '%s <b>%s</b> &middot; %s <b>%s</b>'.format(
				_('Peak'), formatRate(peak).join(' '),
				_('Total'), total != null ? formatBytes(total) : '—');

		card.spark.innerHTML = sparkline(list);
	},

	paint() {
		if (!this.node)
			return;

		this.paintRate(this.cards.down, this.rx, this.totals ? this.totals.rx : null);
		this.paintRate(this.cards.up, this.tx, this.totals ? this.totals.tx : null);

		const wan = this.wans[0];
		const card = this.cards.wan;

		if (!wan) {
			card.value.textContent = _('Offline');
			card.sub.textContent = _('No default route');
			return;
		}

		card.value.textContent = wan.ipaddr || _('Connected');
		card.value.style.fontSize = wan.ipaddr && wan.ipaddr.length > 15 ? '20px' : '';

		card.sub.innerHTML = '<b>%h</b> &middot; %h%s'.format(
			wan.name,
			wan.device || '?',
			wan.uptime ? ' &middot; %s %h'.format(_('up'), '%t'.format(wan.uptime)) : '');

		card.root.title = [ wan.proto, wan.gateway ? _('Gateway') + ': ' + wan.gateway : null ].filter(Boolean).join('\n');
	}
});
