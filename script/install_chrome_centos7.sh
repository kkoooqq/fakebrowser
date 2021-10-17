#!/bin/sh

# chinese support
yum groupinstall chinese-support -y

# g++, make
yum install -y gcc-c++ make
yum install -y automake cmake

# libs
yum install pango.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXtst.x86_64 cups-libs.x86_64 libXScrnSaver.x86_64 libXrandr.x86_64 GConf2.x86_64 alsa-lib.x86_64 atk.x86_64 gtk3.x86_64 -y

# x11, fonts
yum install ipa-gothic-fonts xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-utils xorg-x11-fonts-cyrillic xorg-x11-fonts-Type1 xorg-x11-fonts-misc -y

# chrome stable
cd ~
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
yum localinstall google-chrome-stable_current_x86_64.rpm -y
rm -rf google-chrome-stable_current_x86_64.rpm

