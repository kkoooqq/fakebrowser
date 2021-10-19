
     _______      _            ______                                          
    (_______)    | |          (____  \                                         
    _____  ____  | |  _  ____  ____)  )  ____  ___   _ _ _   ___   ____   ____
    |  ___)/ _  || | / )/ _  )|  __  (  / ___)/ _ \ | | | | /___) / _  ) / ___)
    | |   ( ( | || |< (( (/ / | |__)  )| |   | |_| || | | ||___ |( (/ / | |    
    |_|    \_||_||_| \_)\____)|______/ |_|    \___/  \____|(___/  \____)|_|

-----

# 🐭 Fake browser, headless browser, all for bots 🤖

* **Basic version:**
Based on [puppeteer](https://github.com/puppeteer/puppeteer), uses JavaScript hooks to modify properties and provides a simple api to make your web bot undetectable.
* **Advanced version:**
[fakechrome](https://github.com/kkoooqq/fakechrome) recompiled Chromium to complete the simulation more thoroughly and 

-----

Reverse engineering is not easy, and I would appreciate if you could give a ⭐!

-----

## Technical details

Based on [puppeteer-extra](https://github.com/berstend/puppeteer-extra/), adding lots of evasions to bypass anti-robot checks, providing toolkits to help bot simulate operation of real users.

FakeBrowser automatic login demo:

![](doc/fakebrowser-demo.gif)

Captcha recognition from my another open source project: [anti-captcha](https://github.com/kkoooqq/anti-captcha)

-----

## 🐱 Bot / Fingerprint detection sites 

These pages use many fingerprinting techniques to detect if the browser is crawler software.

Results of running FakeBrowser on **CentOS 7**, **Headless Chrome 93.0.4577.82**, **Socks5 proxy** under AWS VPS:


| Test page | Notes | Result |
| - | - | - |
| [fingerprintjs](https://fingerprintjs.github.io/fingerprintjs/) | Basic fingerprint detection sites that are easy to bypass. | - |
| [creepjs](https://abrahamjuliot.github.io/creepjs/) | Contains lots of advanced detection methods, bypassing it took me a lot of time, but he provides source code, thanks to the author. It uses Worker, ServiceWorker to detect at the same time, and FakeBrowser is perfectly bypassed. | ![](doc/test-score-creepjs.jpg) <img style='width: 500px !important; height: 1px;' />[🔍](doc/test-result-creepjs.png) |
| [pixelscan](https://pixelscan.net) | JS code is obfuscated and can only be restored through the AST tree. The vulnerability is the detection process submits results to server, and we can reverse their analysis process based on the results. It detects if the browser font matches the system in UserAgent. FakeBrowser emulates fonts in 4 ways to bypass the detection perfectly. | ![](doc/test-score-pixelscan.jpg) [🔍](doc/test-result-pixelscan.png) |
| [amiunique](https://amiunique.org/fp) | - | ![](doc/test-score-amiunique.jpg) [🔍](doc/test-result-amiunique.jpg) |
| [browser-fingerprinting](https://niespodd.github.io/browser-fingerprinting) | This author is also working on anti-anti-bot systems, and I learned lots of knowledge from his repository, thank you very much! | ![](doc/test-score-niespodd.jpg) [🔍](doc/test-result-niespodd.jpg) |
| [coveryourtracks](https://coveryourtracks.eff.org/) | This site detects if your canvas/webgl fingerprint is stable by refreshing the page to check if you are a real environment. In fact, simply adding noise to canvas is not enough, undrawn rectangular areas are easily detected if they have noise. FakeBrowser uses an edge detection method that only adds noise to drawn edges of text, circles, ellipses. | ![](doc/test-score-coveryourtracks.jpg) [🔍](doc/test-result-coveryourtracks.png) |
| [f.vision](http://f.vision/) | - | ![](doc/test-score-f.vision.jpg) [🔍](doc/test-result-f.vision.png) |
| [recaptcha-test](https://antcpt.com/eng/information/demo-form/recaptcha-3-test-score.html) | Detects how many points your browser scores in reCaptcha. | ![](doc/test-score-recaptcha.jpg) [🔍](doc/test-result-recaptcha.jpg) |
| [deviceinfo](https://www.deviceinfo.me) | - | ![](doc/test-score-deviceinfo.jpg) |
| [hackability](https://portswigger-labs.net/hackability/) | - | - |
| [sannysoft](https://bot.sannysoft.com/) | No pressure to bypass. | ![](doc/test-score-sannysoft.jpg) [🔍](doc/test-result-sannysoft.jpg) |
| [incolumitas](https://bot.incolumitas.com) | This guy also collects lots of bot detection methods, and his blog contains advanced methods for proxy/VPN detection, recommended following. BTW: He uses puppeteer-extra-plugin-strealth's code bugs for bot detection, and there's nothing he can do if I fix those bugs. His test results are very unstable, with FakeBrowser often jumping between 0.8 and 1.0. Even a normal browser's score can drop to 0.5. | ![](doc/test-score-incolumitas.jpg) [🔍](doc/test-result-incolumitas.png) |
| [antoinevastel](http://antoinevastel.com/bots) | Fingerprint detection page | - |
| [browserleaks](https://browserleaks.com) | Everyone should know what this site is | ![](doc/test-score-browserleaks.jpg) [🔍](doc/test-result-browserleaks.jpg) |
| [morellian](https://plaperdr.github.io/morellian-canvas/Prototype/webpage/picassauth.html) | - | - |
| [vytal.io](https://vytal.io) | - | - |
