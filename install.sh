#!/bin/sh
#
# Install the LuCI Violet theme directly on an OpenWrt router, side by side
# with the stock themes. Bootstrap is never modified or removed.
#
#   sh install.sh             install / update (active theme is left unchanged)
#   sh install.sh activate    install / update and switch LuCI to Violet
#   sh install.sh deactivate  switch back to the previously active theme
#   sh install.sh uninstall   remove Violet and restore the previous theme
#
# Run it on the router from the folder that contains luci-theme-violet/.
# deploy.ps1 does all of this for you from Windows.

set -e

SRC="$(cd "$(dirname "$0")" && pwd)/luci-theme-violet"

STATIC=/www/luci-static/violet
MENU=/www/luci-static/resources/menu-violet.js
INCLUDES=/www/luci-static/resources/view/status/include
TEMPLATES=/usr/share/ucode/luci/template/themes/violet
ACL=/usr/share/rpcd/acl.d/luci-theme-violet.json
VIOLET=/luci-static/violet

flush_caches() {
	rm -f /tmp/luci-indexcache* 2>/dev/null || true
	rm -rf /tmp/luci-modulecache 2>/dev/null || true
	killall -HUP rpcd 2>/dev/null || true
}

# Switch away from Violet to the theme that was active before it
restore_previous() {
	if [ "$(uci -q get luci.main.mediaurlbase)" = "$VIOLET" ]; then
		prev="$(uci -q get luci.violet.previous || true)"
		[ -n "$prev" ] && [ "$prev" != "$VIOLET" ] && [ -d "/www$prev" ] || prev=/luci-static/bootstrap
		uci set luci.main.mediaurlbase="$prev"
		echo "Active theme restored to $prev"
	fi
}

case "$1" in
	uninstall)
		restore_previous
		uci -q delete luci.themes.Violet || true
		uci -q delete luci.violet || true
		uci commit luci

		rm -rf "$STATIC" "$TEMPLATES"
		rm -f "$MENU" "$ACL" "$INCLUDES/00_violet_speed.js" "$INCLUDES/01_violet_clients.js"

		flush_caches
		echo "Violet theme removed. Stock themes were not touched."
		exit 0
	;;
	deactivate)
		restore_previous
		uci commit luci
		flush_caches
		exit 0
	;;
	""|activate)
	;;
	*)
		echo "usage: sh install.sh [activate|deactivate|uninstall]" >&2
		exit 1
	;;
esac

[ -d "$SRC" ] || { echo "error: $SRC not found" >&2; exit 1; }

echo "Installing Violet theme (stock themes are left as they are) ..."

mkdir -p "$STATIC/fonts" "$TEMPLATES" "$INCLUDES" "$(dirname "$MENU")" "$(dirname "$ACL")"

cp "$SRC/htdocs/luci-static/violet/cascade.css" "$STATIC/"
cp "$SRC/htdocs/luci-static/violet/logo.svg" "$STATIC/"
cp "$SRC/htdocs/luci-static/violet/fonts/"* "$STATIC/fonts/"
cp "$SRC/htdocs/luci-static/resources/menu-violet.js" "$MENU"
cp "$SRC/htdocs/luci-static/resources/view/status/include/"*_violet_*.js "$INCLUDES/"
cp "$SRC/ucode/template/themes/violet/"*.ut "$TEMPLATES/"
cp "$SRC/root/usr/share/rpcd/acl.d/luci-theme-violet.json" "$ACL"

chmod 644 "$STATIC"/*.css "$STATIC"/*.svg "$STATIC/fonts/"* "$MENU" "$INCLUDES"/*_violet_*.js "$TEMPLATES"/*.ut "$ACL"

# Register the theme + options (brand ASUS / model RT-AX59U / dark mode)
# without overwriting values that were already customised
sh "$SRC/root/etc/uci-defaults/30_luci-theme-violet"

if [ "$1" = "activate" ]; then
	current="$(uci -q get luci.main.mediaurlbase || true)"
	if [ "$current" != "$VIOLET" ]; then
		uci set luci.violet.previous="${current:-/luci-static/bootstrap}"
		uci set luci.main.mediaurlbase="$VIOLET"
		uci commit luci
	fi
	echo "Violet is now the active theme (previous: ${current:-bootstrap})."
else
	echo "Installed. Select 'Violet' in System > System > Language and Style,"
	echo "or run: sh install.sh activate"
fi

flush_caches

echo "Reload LuCI in your browser (Ctrl+F5). Log out and back in once so the"
echo "Overview dashboard gets its permissions."
