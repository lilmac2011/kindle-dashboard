#!/bin/sh
# Keep the screen on and open the dashboard in the Kindle's browser.
URL="https://lilmac2011.github.io/kindle-dashboard/"
lipc-set-prop com.lab126.powerd preventScreenSaver 1
lipc-set-prop com.lab126.appmgrd start "app://com.lab126.browser?view=$URL"
