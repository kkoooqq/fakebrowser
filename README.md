
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
Results for FakeBrowser running on CentOS 7, Chrome headless mode:

| Test page | Notes | Result |
| - | - | - |
| https://fingerprintjs.github.io/fingerprintjs/ | Basic fingerprint detection sites that are easy to bypass. | - |
| https://abrahamjuliot.github.io/creepjs/ | Contains a lot of very advanced detection methods, bypassing it took me a lot of time, but he provides the source code, thanks to the author | - |
| https://pixelscan.net | JS code is obfuscated and can only be restored through the AST tree. The vulnerability is that the detection process submits the results to the server, and we can reverse their analysis process based on the results. | - |

