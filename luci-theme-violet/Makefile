#
# LuCI Violet theme - VS Code "Dark Modern" inspired, violet accent.
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Violet Theme (VS Code inspired, sidebar layout)
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

PKG_LICENSE:=Apache-2.0 OFL-1.1
PKG_MAINTAINER:=Emran Mostafa

define Package/luci-theme-violet/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# Only touch the active theme if Violet is the one selected; restore the
	# theme that was active before it (stock themes are never modified)
	if [ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/violet" ]; then
		prev="$$(uci -q get luci.violet.previous)"
		[ -n "$$prev" ] && [ -d "/www$$prev" ] || prev=/luci-static/bootstrap
		uci set luci.main.mediaurlbase="$$prev"
	fi
	uci -q delete luci.themes.Violet
	uci -q delete luci.violet
	uci commit luci
}
endef

# Inside the LuCI feed use the relative path, otherwise the installed feed
ifneq ($(wildcard ../../luci.mk),)
include ../../luci.mk
else
include $(TOPDIR)/feeds/luci/luci.mk
endif

# call BuildPackage - OpenWrt buildroot signature
