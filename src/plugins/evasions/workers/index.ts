import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
    internalHttpServerPort: any;
    browserUUID: any;
}

const mainFunction = (utils: typeof Utils, opts: PluginOptions) => {
    const { internalHttpServerPort, browserUUID } = opts
    if ('undefined' !== typeof Worker) {
        // noinspection UnnecessaryLocalVariableJS
        const _Worker = Worker;
        const workerConstructor = Object.getOwnPropertyDescriptor(_Worker.prototype, 'constructor')!;
        utils.replaceWithProxy(utils.cache.global, 'Worker', {
            construct: function (target, args) {
                // console.log(`worker is registered in the browser, ${args[0]}`);
                const relUrl = window.location.href;
                const workerUrl = args[0].toString();
                // fix: The worker's relative path is relative to the current page path.
                // reference: https://github.com/shehua/Alice/blob/master/w3c/html5-web-workers.md
                // noinspection LoopStatementThatDoesntLoopJS
                for (; ;) {
                    if (!workerUrl) {
                        break;
                    }
                    if (workerUrl.includes('://') && !(workerUrl.startsWith('http://') || workerUrl.startsWith('https://'))) {
                        break;
                    }
                    args[0] = `http://127.0.0.1:${internalHttpServerPort}/patchWorker?type=worker&uuid=${browserUUID}&relUrl=${encodeURIComponent(relUrl)}&workerUrl=${encodeURIComponent(workerUrl)}`;

                    break;
                }

                return new workerConstructor.value(...args);
            },
        });
    }

    if ('undefined' !== typeof SharedWorker) {
        const _SharedWorker = SharedWorker;
        const sharedWorkerConstructor = Object.getOwnPropertyDescriptor(
            _SharedWorker.prototype, 'constructor',
        )!;

        utils.replaceWithProxy(utils.cache.global, 'SharedWorker', {
            construct: function (target, args) {
                // console.log(`sharedWorker is registered in the browser, ${args[0]}`);
                const relUrl = window.location.href;
                const workerUrl = args[0].toString();
                // noinspection LoopStatementThatDoesntLoopJS
                for (; ;) {
                    if (!workerUrl) {
                        break;
                    }
                    if (
                        workerUrl.includes('://') &&
                        !(
                            workerUrl.startsWith('http://')
                            || workerUrl.startsWith('https://')
                        )
                    ) {
                        break;
                    }
                    args[0] = `http://127.0.0.1:${internalHttpServerPort}/patchWorker?type=sharedWorker&uuid=${browserUUID}&relUrl=${encodeURIComponent(relUrl)}&workerUrl=${encodeURIComponent(workerUrl)}`;
                    break;
                }
                return new sharedWorkerConstructor.value(...args);
            },
        });
    }
};


export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/workers' {
        return 'evasions/workers';
    }

    async onPageCreated(page: PuppeteerPage): Promise<void> {
        await withUtils(this, page).evaluateOnNewDocument(mainFunction, {
            internalHttpServerPort: this.opts.internalHttpServerPort,
            browserUUID: this.opts.browserUUID,
        });
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
