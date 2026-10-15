'use strict';
'require baseclass';
'require ui';

/*
 * LuCI Violet theme - sidebar navigation, breadcrumbs and tab menus.
 * Licensed to the public under the Apache License 2.0.
 */

const ICONS = {
	grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
	route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
	wall: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.5h18M9 4v5.5M15 9.5v5M9 14.5V20"/>',
	log: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
	list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
	channels: '<path d="M2 20c2-9 4-13 6-13s4 4 6 13M10 20c2-6 4-9 6-9s4 3 6 9"/>',
	activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
	chart: '<path d="M3 20h18"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
	sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
	key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2"/>',
	package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
	power: '<path d="M12 3v8"/><path d="M6.4 6.4a8 8 0 1 0 11.2 0"/>',
	clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
	drive: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5.5 13 8 5h8l2.5 8M7 16.5h.01M11 16.5h.01"/>',
	bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
	download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
	reboot: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
	nodes: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-2.5h14V17"/>',
	wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.3a10 10 0 0 1 14 0M8.5 15.8a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
	server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
	terminal: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 9 3 3-3 3M12 15h6"/>',
	switch: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>',
	globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
	share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
	lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
	shield: '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z"/>',
	folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
	layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
	gauge: '<path d="M4.9 19a9 9 0 1 1 14.2 0"/><path d="m12 13 4-4"/>',
	dot: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
	chevron: '<path d="m9 6 6 6-6 6"/>'
};

/* Menu node name -> icon */
const ITEM_ICONS = {
	overview: 'grid', routes: 'route', routing: 'route',
	iptables: 'wall', nftables: 'wall', firewall: 'wall', fw4: 'wall',
	syslog: 'log', dmesg: 'log', logs: 'log', log: 'log',
	processes: 'list', channel_analysis: 'channels', realtime: 'activity',
	graphs: 'chart', collectd: 'chart', nlbw: 'chart', statistics: 'chart',
	system: 'sliders', admin: 'key', 'package-manager': 'package', opkg: 'package', apk: 'package', software: 'package',
	startup: 'power', crontab: 'clock', mounts: 'drive', leds: 'bulb',
	flash: 'download', attendedsysupgrade: 'download', reboot: 'reboot',
	network: 'nodes', interfaces: 'nodes', wireless: 'wifi', wifi: 'wifi',
	dhcp: 'server', hosts: 'server', dns: 'globe', ddns: 'globe',
	diagnostics: 'terminal', ttyd: 'terminal', terminal: 'terminal',
	switch: 'switch', ports: 'switch', vlan: 'switch',
	upnp: 'share', wireguard: 'lock', openvpn: 'lock', vpn: 'lock',
	adblock: 'shield', banip: 'shield', 'https-dns-proxy': 'shield',
	samba: 'folder', samba4: 'folder', ksmbd: 'folder', nas: 'folder',
	sqm: 'gauge', qos: 'gauge'
};

/* Top level category -> fallback icon for unknown pages */
const CATEGORY_ICONS = {
	status: 'activity', system: 'sliders', services: 'layers', network: 'nodes',
	vpn: 'lock', statistics: 'chart', nas: 'folder', control: 'shield'
};

function svg(name, cls) {
	const span = E('span', { 'class': cls || 'vl-icon', 'aria-hidden': 'true' });
	span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.dot) + '</svg>';
	return span;
}

function pickIcon(name, parent) {
	return ITEM_ICONS[name] || (ICONS[name] ? name : null) || CATEGORY_ICONS[parent] || 'dot';
}

function storeGet(key) {
	try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storeSet(key, value) {
	try {
		if (value == null)
			localStorage.removeItem(key);
		else
			localStorage.setItem(key, value);
	} catch (e) {}
}

return baseclass.extend({
	__init__() {
		this.bindChrome();
		this.bindSectionToggles();
		ui.menu.load().then((tree) => this.render(tree));
	},

	/*
	 * The Status page's "Hide" / "Show" labels and the header's "Refreshing" /
	 * "Paused" indicator are drawn as icons by the stylesheet. Keep a tooltip
	 * and accessible name in sync with LuCI's (translated) label text and make
	 * them usable from the keyboard.
	 */
	bindSectionToggles() {
		const selector = '.cbi-title > h3 > .label[data-clickable], #indicators [data-indicator="poll-status"]';

		const sync = () => {
			document.querySelectorAll(selector).forEach(btn => {
				const text = btn.textContent.trim();

				if (text && btn.getAttribute('title') != text) {
					btn.setAttribute('title', text);
					btn.setAttribute('aria-label', text);
				}

				if (!btn.hasAttribute('tabindex')) {
					btn.setAttribute('tabindex', '0');
					btn.setAttribute('role', 'button');
					btn.addEventListener('keydown', (ev) => {
						if (ev.key == 'Enter' || ev.key == ' ') {
							ev.preventDefault();
							btn.click();
						}
					});
				}
			});
		};

		/* attribute changes are not observed, so updating title/tabindex cannot loop */
		const observer = new MutationObserver(sync);

		[ '#maincontent', '#indicators' ].forEach(id => {
			const el = document.querySelector(id);
			if (el)
				observer.observe(el, { childList: true, subtree: true, characterData: true });
		});

		sync();
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);
		this.renderCrumbs(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (let i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	/* ----- Title bar breadcrumbs ----- */

	renderCrumbs(tree) {
		const crumbs = document.querySelector('#vl-crumbs');
		const path = L.env.dispatchpath || [];
		const titles = [];
		let node = tree;

		for (let i = 0; i < path.length && node; i++) {
			node = node.children ? node.children[path[i]] : null;

			if (node && i >= 1 && node.title)
				titles.push(_(node.title));
		}

		if (!crumbs || !titles.length)
			return;

		crumbs.textContent = '';

		titles.forEach((title, i) => {
			if (i > 0)
				crumbs.appendChild(E('span', { 'class': 'sep' }, '/'));

			crumbs.appendChild(E('span', { 'class': 'crumb' }, title));
		});
	},

	/* ----- Tabs below the title bar ----- */

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		children.forEach(child => {
			const isActive = (L.env.dispatchpath[3 + (level || 0)] == child.name);
			const className = 'tabmenu-item-%s %s'.format(child.name, isActive ? 'active' : '');

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				activeNode = child;
		});

		if (ul.children.length == 0)
			return E([]);

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

		return ul;
	},

	/* ----- Sidebar ----- */

	renderMainMenu(tree, url) {
		const ul = document.querySelector('#topmenu');
		const categories = ui.menu.getChildren(tree);
		const active1 = L.env.dispatchpath[1];
		const active2 = L.env.dispatchpath[2];
		const loose = [];
		let collapsed = {};

		try { collapsed = JSON.parse(storeGet('vl-sections') || '{}') || {}; } catch (e) {}

		const item = (href, title, iconName, isActive, extra) => E('li', {
			'class': 'vl-item' + (isActive ? ' active' : ''),
			'data-search': (title + ' ' + (extra || '')).toLowerCase()
		}, [
			E('a', { 'href': href }, [ svg(iconName), E('span', { 'class': 'vl-label' }, title) ])
		]);

		categories.forEach(category => {
			const pages = ui.menu.getChildren(category);

			/* Log out lives in the user card at the bottom of the sidebar */
			if (category.name == 'logout')
				return;

			if (!pages.length) {
				loose.push(category);
				return;
			}

			const categoryTitle = _(category.title);
			const items = E('ul', { 'class': 'vl-items' });

			pages.forEach(page => {
				items.appendChild(item(
					L.url(url, category.name, page.name),
					_(page.title),
					pickIcon(page.name, category.name),
					active1 == category.name && active2 == page.name,
					categoryTitle
				));
			});

			const isCollapsed = collapsed[category.name] && active1 != category.name;
			const title = E('div', { 'class': 'vl-section-title', 'role': 'button', 'tabindex': '0', 'aria-expanded': String(!isCollapsed) }, [
				E('span', {}, categoryTitle),
				svg('chevron', 'vl-chev')
			]);

			const section = E('li', {
				'class': 'vl-section' + (isCollapsed ? ' collapsed' : ''),
				'data-name': category.name
			}, [ title, items ]);

			const toggle = (ev) => {
				if (ev.type == 'keydown' && ev.key != 'Enter' && ev.key != ' ')
					return;

				ev.preventDefault();

				const now = section.classList.toggle('collapsed');
				title.setAttribute('aria-expanded', String(!now));

				if (now)
					collapsed[category.name] = true;
				else
					delete collapsed[category.name];

				storeSet('vl-sections', JSON.stringify(collapsed));
			};

			title.addEventListener('click', toggle);
			title.addEventListener('keydown', toggle);

			ul.appendChild(section);
		});

		/* Top level pages without children go in an untitled section first */
		if (loose.length) {
			const items = E('ul', { 'class': 'vl-items' });

			loose.forEach(page => items.appendChild(item(
				L.url(url, page.name), _(page.title),
				pickIcon(page.name, null), active1 == page.name)));

			ul.insertBefore(E('li', { 'class': 'vl-section', 'data-name': '' }, [ items ]), ul.firstChild);
		}

		ul.appendChild(E('li', { 'class': 'vl-empty', 'style': 'display:none' }, _('No matching sections')));
		ul.style.display = '';

		const active = ul.querySelector('.vl-item.active');
		if (active)
			active.scrollIntoView({ block: 'nearest' });

		return ul;
	},

	renderModeMenu(tree) {
		const ul = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			ul.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				this.renderMainMenu(child, child.name);
		});

		if (ul.children.length > 1)
			ul.style.display = '';
	},

	/* ----- Sidebar toggle, drawer and section search ----- */

	bindChrome() {
		const body = document.body;
		const toggle = document.querySelector('#vl-toggle');
		const scrim = document.querySelector('#vl-scrim');
		const search = document.querySelector('#vl-search');
		const kbd = document.querySelector('#vl-search-kbd');
		const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

		if (toggle)
			toggle.addEventListener('click', () => {
				if (isMobile()) {
					body.classList.toggle('vl-sidebar-open');
				}
				else {
					const collapsed = body.classList.toggle('vl-collapsed');
					storeSet('vl-collapsed', collapsed ? '1' : null);
				}
			});

		if (scrim)
			scrim.addEventListener('click', () => body.classList.remove('vl-sidebar-open'));

		if (kbd && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
			kbd.textContent = '⌘K';

		if (search) {
			search.addEventListener('input', () => this.filterMenu(search.value));
			search.addEventListener('keydown', (ev) => {
				if (ev.key == 'Escape') {
					search.value = '';
					this.filterMenu('');
					search.blur();
				}
				else if (ev.key == 'Enter') {
					const hit = document.querySelector('#topmenu .vl-item.search-hit > a');
					if (hit)
						location.href = hit.href;
				}
			});
		}

		document.addEventListener('keydown', (ev) => {
			if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key == 'k' || ev.key == 'K') && search) {
				ev.preventDefault();
				body.classList.remove('vl-collapsed');
				if (isMobile())
					body.classList.add('vl-sidebar-open');
				search.focus();
				search.select();
			}
			else if (ev.key == 'Escape' && body.classList.contains('vl-sidebar-open')) {
				body.classList.remove('vl-sidebar-open');
			}
		});
	},

	filterMenu(query) {
		const q = String(query || '').trim().toLowerCase();
		const menu = document.querySelector('#topmenu');
		let first = null;

		if (!menu)
			return;

		menu.classList.toggle('searching', q.length > 0);

		menu.querySelectorAll('.vl-section').forEach(section => {
			let visible = 0;

			section.querySelectorAll('.vl-item').forEach(li => {
				const match = !q || (li.getAttribute('data-search') || '').indexOf(q) > -1;

				li.style.display = match ? '' : 'none';
				li.classList.remove('search-hit');

				if (match) {
					visible++;

					if (q && !first)
						first = li;
				}
			});

			section.style.display = visible ? '' : 'none';
		});

		if (first)
			first.classList.add('search-hit');

		const empty = menu.querySelector('.vl-empty');
		if (empty)
			empty.style.display = (q && !first) ? '' : 'none';
	}
});
