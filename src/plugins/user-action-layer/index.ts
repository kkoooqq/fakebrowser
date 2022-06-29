import { FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../evasions/_utils/'
import withUtils from '../evasions/_utils/withUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name() {
        return 'evasions/user-action-layer';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(
            (utils: typeof Utils) => {
                window.addEventListener('DOMContentLoaded', () => {
                    // Add a canvas on top of the document.body
                    const canvas = document.createElement('canvas');
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    canvas.style.userSelect = 'none';
                    canvas.style.pointerEvents = 'none';
                    canvas.style.position = 'fixed';
                    canvas.style.left = '0px';
                    canvas.style.top = '0px';
                    canvas.style.width = '' + window.innerWidth + 'px';
                    canvas.style.height = '' + window.innerHeight + 'px';
                    canvas.style.zIndex = '999999';
                    // noinspection JSCheckFunctionSignatures
                    document.body.appendChild(canvas);

                    const cxt = canvas.getContext('2d')!;

                    // Listening user events and draw
                    document.addEventListener('keydown', (e) => {
                        // console.log('key DOWN alt:' + e.altKey + ' shift:' + e.shiftKey + ' ctrl:' + e.ctrlKey + ' meta:' + e.metaKey + ' code:' + e.code);
                    });

                    document.addEventListener('keyup', (e) => {
                        // console.log('key UP alt:' + e.altKey + ' shift:' + e.shiftKey + ' ctrl:' + e.ctrlKey + ' meta:' + e.metaKey + ' code:' + e.code);
                    });

                    document.addEventListener('mousemove', (e) => {
                        cxt.beginPath();
                        cxt.arc(e.clientX, e.clientY, 3, 0, 360, false);
                        cxt.fillStyle = 'green';
                        cxt.fill();
                        cxt.closePath();
                    });

                    document.addEventListener('mousedown', (e) => {
                        cxt.beginPath();
                        cxt.arc(e.clientX, e.clientY, 15, 0, 360, false);
                        cxt.fillStyle = 'black';
                        cxt.fill();
                        cxt.closePath();
                    });

                    document.addEventListener('mouseup', (e) => {
                        cxt.beginPath();
                        cxt.arc(e.clientX, e.clientY, 9, 0, 360, false);
                        cxt.fillStyle = 'blue';
                        cxt.fill();
                        cxt.closePath();
                    });
                });
            },
        );
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
