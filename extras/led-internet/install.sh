#!/bin/sh
#
# Install the internet status light service on the router.
#
#   sh install.sh             install and start
#   sh install.sh uninstall   stop and remove it
#
# Copy this folder to the router first, e.g. from Windows:
#   scp -O -r extras/led-internet root@192.168.50.1:/tmp/

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" = "uninstall" ]; then
	/etc/init.d/led-internet stop 2>/dev/null || true
	/etc/init.d/led-internet disable 2>/dev/null || true
	rm -f /etc/init.d/led-internet /usr/libexec/led-internet
	for c in red green blue; do uci -q delete "system.led_status_$c" || true; done
	uci commit system
	/etc/init.d/led restart
	echo "Removed. Reboot to get the default green status light back."
	exit 0
fi

cp "$DIR/led-internet" /usr/libexec/led-internet
cp "$DIR/led-internet.init" /etc/init.d/led-internet
chmod +x /usr/libexec/led-internet /etc/init.d/led-internet

# Saved LED rules for the status light (e.g. made in LuCI) would fight the
# service, so remove the ones that use green/red/blue:status
for s in $(uci -X show system | sed -n 's/^system\.\([^.=]*\)=led$/\1/p'); do
	case "$(uci -q get "system.$s.sysfs")" in
		*:status) uci delete "system.$s" ;;
	esac
done
uci commit system
/etc/init.d/led restart

# (re)create the boot links: the service starts early (S11) and stops first (K10)
/etc/init.d/led-internet disable 2>/dev/null || true
/etc/init.d/led-internet enable
/etc/init.d/led-internet restart

echo "Installed. Checking the connection ..."
sleep 6
logread -e led-internet | tail -n 3
