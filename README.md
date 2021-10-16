
     _______      _            ______                                          
    (_______)    | |          (____  \                                         
    _____  ____  | |  _  ____  ____)  )  ____  ___   _ _ _   ___   ____   ____
    |  ___)/ _  || | / )/ _  )|  __  (  / ___)/ _ \ | | | | /___) / _  ) / ___)
    | |   ( ( | || |< (( (/ / | |__)  )| |   | |_| || | | ||___ |( (/ / | |    
    |_|    \_||_||_| \_)\____)|______/ |_|    \___/  \____|(___/  \____)|_|

-----

# Fake browser, headless browser, all for bots.

* **Basic version:**
Based on puppeteer and [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth), uses javascript hooks to modify properties and provides a simple api to make your web bot undetectable.
* **Advanced version:**
Based on Chromium, recompiled to complete the simulation more thoroughly.

---

Reverse engineering is not easy, and I would appreciate if you could give a ⭐!

---

### Bot / Fingerprint detection pages

These pages use many fingerprinting techniques to detect if the browser is crawler software.

| Test page | Notes | Result |
| - | - | - |
| https://fingerprintjs.github.io/fingerprintjs/ | Basic fingerprint detection sites that are easy to bypass. | - |

