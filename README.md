
     _______      _            ______                                          
    (_______)    | |          (____  \                                         
    _____  ____  | |  _  ____  ____)  )  ____  ___   _ _ _   ___   ____   ____
    |  ___)/ _  || | / )/ _  )|  __  (  / ___)/ _ \ | | | | /___) / _  ) / ___)
    | |   ( ( | || |< (( (/ / | |__)  )| |   | |_| || | | ||___ |( (/ / | |    
    |_|    \_||_||_| \_)\____)|______/ |_|    \___/  \____|(___/  \____)|_|

-----

# Fake browser, headless browser, all for bots.

* **Basic version:**
Based on puppeteer, uses javascript hooks to modify properties and provides a simple api to make your web bot undetectable.
* **Advanced version:**
Based on Chromium, recompiled to complete the simulation more thoroughly.

-----

Reverse engineering is not easy, and I would appreciate if you could give a ⭐!

-----

## Technical details

Based on [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth), adding lots of evasions to bypass anti-robot checks, providing toolkits to help bot simulate operation of real users.

![](doc/fakebrowser-demo.gif)

-----

### Bot / Fingerprint detection pages

These pages use many fingerprinting techniques to detect if the browser is crawler software.
Results of running FakeBrowser on CentOS 7, Chrome headless mode, using socks5 for proxy:

| Test page | Notes | Result <img width=120 /> |
| - | - | - |
| [fingerprintjs](https://fingerprintjs.github.io/fingerprintjs/) | Basic fingerprint detection sites that are easy to bypass. | - |
| [creepjs](https://abrahamjuliot.github.io/creepjs/) | Contains a lot of very advanced detection methods, bypassing it took me a lot of time, but he provides source code, thanks to the author. It uses Worker, ServiceWorker to detect at the same time, and FakeBrowser is perfectly bypassed. | ![](doc/test-score-creepjs.jpg) |
| [pixelscan](https://pixelscan.net) | JS code is obfuscated and can only be restored through the AST tree. The vulnerability is the detection process submits results to server, and we can reverse their analysis process based on the results. It detects if the browser font matches the system in UserAgent. FakeBrowser emulates fonts in 4 ways to bypass the detection perfectly. | ![](doc/test-score-pixelscan.jpg) |
| [amiunique](https://amiunique.org/fp) | - | - |
| [browser-fingerprinting](https://niespodd.github.io/browser-fingerprinting) | This author is also working on anti-anti-bot systems, and I learned lots of knowledge from his repository, thank you very much! | - |
| [coveryourtracks](https://coveryourtracks.eff.org/) | This site detects if your canvas/webgl fingerprint is stable by refreshing the page to check if you are a real environment. In fact, simply adding noise to canvas is not enough, undrawn rectangular areas are easily detected if they have noise. FakeBrowser uses an edge detection method that only adds noise to drawn edges of text, circles, ellipses. | - |
| [f.vision](http://f.vision/) | - | - |
| [recaptcha-test](https://antcpt.com/eng/information/demo-form/recaptcha-3-test-score.html) | Detects how many points your browser scores in reCaptcha. | - |
| [deviceinfo](https://www.deviceinfo.me) | - | - |
| [hackability](https://portswigger-labs.net/hackability/) | - | - |
| [sannysoft](https://bot.sannysoft.com/) | - | - |
| [incolumitas](https://bot.incolumitas.com) | - | - |
| [antoinevastel](http://antoinevastel.com/bots) | - | - |
| [browserleaks](https://browserleaks.com) | - | - |
