# Violet – LuCI theme for OpenWrt

A dark theme for the OpenWrt web interface (LuCI). It works on any router running
**OpenWrt 23.05 or newer**. It was developed and tested on an ASUS RT-AX59U with OpenWrt 25.12.5.

Designed by **Emran Mostafa**.

- VS Code "Dark Modern" palette (`#181818` / `#1f1f1f` surfaces, `#cccccc` text) with a violet accent
- Google Sans, bundled so it works without internet. Headings are bold and body text is regular weight
- Sidebar showing the router's **hostname** in a violet brand block, with
  "Search sections" (Ctrl K / ⌘K). Uppercase section headings, icon items and a user card with
  log out
- Title bar with breadcrumbs, VS Code-style tabs, and a violet status bar
- **Status › Overview** starts with a dashboard:
  - **Internet Speed**: live download and upload of the WAN, with sparklines, peak and total, updated every 2 s
  - **Connected Devices**: WiFi clients (name, IP, MAC, band/SSID, signal, rate, connected time)
    and LAN clients (name, IP, MAC, interface, DHCP lease)
- Custom login page, light/auto variant, works at phone width

## It never replaces the stock theme

Violet installs **next to** Bootstrap. No Bootstrap file is changed or removed.

- Installing does **not** change the active theme unless you ask for it (`-Activate`).
- The Overview dashboard only appears while Violet is active. Under Bootstrap the
  Overview page stays exactly as it was.
- Uninstalling or deactivating switches back to the theme that was active before.
- If Violet ever fails to render, LuCI falls back to another installed theme on its own.

## Install from Windows (no build needed)

The theme is plain CSS/JS/templates, so it can be copied straight to the router.
The script finds your router automatically. It is the default gateway that serves LuCI.
It uses Windows' OpenSSH client, or Git for Windows' `ssh`/`scp` if that is not installed.
You'll be asked for the router's root password twice, once for the upload and once for the install.

```powershell
cd "$HOME\Desktop\OPENWRT"
.\deploy.ps1 -Activate            # install and switch to Violet
.\deploy.ps1                      # install/update only, keep the current theme
.\deploy.ps1 -Deactivate          # back to the previous theme (Violet stays installed)
.\deploy.ps1 -Uninstall           # remove Violet completely
.\deploy.ps1 -Router 192.168.50.1 -Activate   # give the router address yourself
```

After installing, press **Ctrl+F5** in the browser. **Log out and log in once** so the
Overview dashboard gets its read permissions.

You can also switch themes in LuCI under **System › System › Language and Style**.

If PowerShell blocks the script, run it once with:
`powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Activate`

## Install on the router by hand

Copy `install.sh` and the `luci-theme-violet/` folder to the router, then:

```sh
sh install.sh activate     # or: sh install.sh | deactivate | uninstall
```

## Build a package (.apk) with the OpenWrt SDK

OpenWrt 25.12 uses `apk` packages. With the 25.12 SDK for `mediatek/filogic`:

```sh
cp -r luci-theme-violet <sdk>/package/
cd <sdk>
./scripts/feeds update -a && ./scripts/feeds install luci-base
make package/luci-theme-violet/compile
# bin/packages/*/base/luci-theme-violet-*.apk
```

On the router: `apk add --allow-untrusted /tmp/luci-theme-violet-*.apk`, then pick Violet in
Language and Style. The package does not change the active theme.

## Options

The sidebar and login page show the router's hostname, set in **System › System › Hostname**.
To show something else:

```sh
uci set luci.violet.brand='HomeLab'    # text in the violet block (default: hostname)
uci set luci.violet.model='Main AP'    # optional second text in the accent color
uci set luci.violet.mode='dark'        # dark | light | auto (follow the OS)
uci commit luci
```

To go back to the hostname, run `uci delete luci.violet.brand; uci delete luci.violet.model; uci commit luci`.

Colors are CSS variables at the top of `htdocs/luci-static/violet/cascade.css`. For example,
`--vl-accent` is the violet and `--vl-model` is the color of the optional second text.

## How the device lists work

- **WiFi clients** come from the access points' association lists, with names and IPs from DHCP and host hints.
- **LAN clients** are the reachable entries in the router's ARP table (`/proc/net/arp`)
  that are not WiFi clients, so devices with static IPs show up too. If the ARP table can't
  be read yet (before you log in again), active DHCP leases are used instead.
- Speed is measured from the WAN interface byte counters (`luci-rpc getNetworkDevices`).

## Preview without a router

The preview runs the real theme JavaScript against fake router data. There are two ways to open it:

- **Quick look:** double-click `preview\index.html`, `form.html` (a settings page) or `login.html`.
- **Live preview, which reloads by itself while you edit:**

  ```powershell
  node preview\serve.js
  ```

  Open http://localhost:8765/preview/. Every time you save a file in `luci-theme-violet\` or
  `preview\`, the open tabs reload automatically.

Add `?mode=light` to the URL for the light variant. The double-click version uses a copy of the theme
scripts in `preview\modules.js`. `serve.js` refreshes that copy automatically, or you can run
`node preview\build.js` after editing without the server.

## Extra: internet status light (ASUS RT-AX59U)

`extras/led-internet/` is a small service for the RT-AX59U's status light. It is separate from
the theme:

| State | Light |
|---|---|
| Booting / rebooting | purple (red + blue) |
| Internet online | green, blinking with WAN traffic |
| WAN link down or internet unreachable | solid red |

Install it from Windows with `.\extras\led-internet\deploy.ps1`, or remove it with `-Uninstall`.
The current state is kept as LED rules, which you can see in **System › LED Configuration**.
Events are logged; see them with `logread -e led-internet`. Settings such as the WAN interface,
ping targets and timings are at the top of `extras/led-internet/led-internet`. Other routers have
different LED names (`ls /sys/class/leds`), so those need changing before it works there.

## Files

```
luci-theme-violet/
  Makefile                                   OpenWrt package (luci.mk)
  htdocs/luci-static/violet/                 cascade.css, logo.svg, fonts/ (Google Sans, OFL)
  htdocs/luci-static/resources/menu-violet.js            sidebar, search, breadcrumbs, tabs
  htdocs/luci-static/resources/view/status/include/      00_violet_speed.js, 01_violet_clients.js
  ucode/template/themes/violet/              header.ut, footer.ut, sysauth.ut (login)
  root/etc/uci-defaults/30_luci-theme-violet registers the theme + default options
  root/usr/share/rpcd/acl.d/luci-theme-violet.json       read access for the dashboard
extras/led-internet/                         status light service (RT-AX59U)
install.sh   deploy.ps1   preview/
```

Licenses: theme code Apache-2.0 (some widget CSS adapted from luci-theme-bootstrap);
Google Sans SIL OFL 1.1 (`fonts/OFL.txt`).
