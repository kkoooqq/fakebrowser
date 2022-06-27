import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
}

/**
 * Mock the `chrome.app` object if not available (e.g. when running headless).
 */
export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts = {}) {
        super(opts);
    }

    get name(): 'evasions/chrome.app' {
        return 'evasions/chrome.app';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    mainFunction = (utils: typeof Utils) => {
        if (!window.chrome) {
            // Use the exact property descriptor found in headful Chrome
            // fetch it via `Object.getOwnPropertyDescriptor(window, 'chrome')`
            utils.cache.Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: false, // note!
                value: {}, // We'll extend that later
            });
        }

        // That means we're running headful and don't need to mock anything
        if ('app' in window.chrome) {
            return; // Nothing to do here
        }

        const makeError = {
            ErrorInInvocation: (fn: string) => {
                const err = new TypeError(`Error in invocation of app.${fn}()`);
                return utils.stripErrorWithAnchor(
                    err,
                    `at ${fn} (eval at <anonymous>`,
                );
            },
        };

        // There's a some static data in that property which doesn't seem to change,
        // we should periodically check for updates: `JSON.stringify(window.app, null, 2)`
        const STATIC_DATA = JSON.parse(
            `
{
  "isInstalled": false,
  "InstallState": {
    "DISABLED": "disabled",
    "INSTALLED": "installed",
    "NOT_INSTALLED": "not_installed"
  },
  "RunningState": {
    "CANNOT_RUN": "cannot_run",
    "READY_TO_RUN": "ready_to_run",
    "RUNNING": "running"
  }
}
        `.trim(),
        );

        (window.chrome as any).app = {
            ...STATIC_DATA,

            get isInstalled() {
                return false;
            },

            getDetails: function getDetails() {
                if (arguments.length) {
                    throw makeError.ErrorInInvocation(`getDetails`);
                }
                return null;
            },
            getIsInstalled: function getDetails() {
                if (arguments.length) {
                    throw makeError.ErrorInInvocation(`getIsInstalled`);
                }
                return false;
            },
            runningState: function getDetails() {
                if (arguments.length) {
                    throw makeError.ErrorInInvocation(`runningState`);
                }
                return 'cannot_run';
            },
        };

        utils.patchToStringNested((window.chrome as any).app);
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
