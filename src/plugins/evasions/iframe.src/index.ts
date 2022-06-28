import { PluginRequirements, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
}

// There's a pretty crazy detection that exploits a CDP or puppeteer vulnerability, I forget where I read it: (pixelscan.net?)
//
// <iframe src="javascript:alert(navigator.userAgent);" />
//
// Here navigator.userAgent is able to get the actual browser information and is not intercepted by any method and has no events.
export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/iframe.src' {
        return 'evasions/iframe.src';
    }

    get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    mainFunction = (utils: typeof Utils) => {
        const _Reflect = utils.cache.Reflect;

        const Element_Prototype_remove = Element.prototype.remove;

        // Cache actual src of iframe
        const iframeSrcCache: Array<{v: HTMLIFrameElement, src: string}> = [];

        const getIFrameOriginalSrc = (iframe: HTMLIFrameElement) => {
            const srcCache = iframeSrcCache.find(e => e.v === iframe);
            return srcCache ? srcCache.src : null;
        };

        const interceptPatchIFrameSrc = (iframe: HTMLIFrameElement, src: string) => {
            if (src && src.trim().toLowerCase().startsWith('javascript:')) {
                // console.log('!!! h00k iframe src: ' + src);
                iframeSrcCache.push({ v: iframe, src });
                // If it's already in dom, remove it first and then add it
                const parent = iframe.parentElement;
                if (parent) {
                    Element_Prototype_remove.call(iframe);
                    // This will trigger the Element.prototype.append trap
                    parent.appendChild(iframe);
                }
                return true;
            }
            return false;
        };

        // hook src of all iFrames
        utils.replaceSetterWithProxy(HTMLIFrameElement.prototype, 'src', {
            apply(target: any, thisArg: any, args: any) {
                const src = args[0];
                if (!interceptPatchIFrameSrc(thisArg, src)) {
                    return _Reflect.apply(target, thisArg, args);
                }
            },
        });


        utils.replaceGetterWithProxy(HTMLIFrameElement.prototype, 'src', {
            apply(target, thisArg, args) {
                let result = getIFrameOriginalSrc(thisArg);
                if (!result) {
                    result = _Reflect.apply(target, thisArg, args);
                }
                return result;
            },
        });

        utils.replaceWithProxy(Element.prototype, 'setAttribute', {
            apply(target, thisArg, args) {
                const attr = args[0];
                if (thisArg instanceof HTMLIFrameElement && attr === 'src') {
                    const src = args[1];
                    if (interceptPatchIFrameSrc(thisArg, src)) {
                        return;
                    }
                }
                return _Reflect.apply(target as any, thisArg, args);
            },
        });

        utils.replaceWithProxy(Element.prototype, 'getAttribute', {
            apply(target: any, thisArg: any, args: any) {
                const attr = args && args[0];
                let result = null;
                if (thisArg instanceof HTMLIFrameElement && attr === 'src') {
                    result = getIFrameOriginalSrc(thisArg);
                }
                if (!result) {
                    result = _Reflect.apply(target, thisArg, args);
                }
                return result;
            },
        });

        utils.replaceWithProxy(Element.prototype, 'appendChild', {
            apply(target: any, thisArg: any, args: any) {
                const result = _Reflect.apply(target, thisArg, args);
                // if an iframe has been added
                if (args && args[0] instanceof HTMLIFrameElement) {
                    const iframe = args[0];
                    const cache = iframeSrcCache.find(e => e.v === iframe);
                    if (cache) {
                        // console.log('h00k iframe: iframe was added to dom!');
                        try {
                            let src = cache.src.trim();
                            if (src.toLowerCase().startsWith('javascript://')) {
                                src = src.substr('javascript://'.length);
                            }
                            if (src.toLowerCase().startsWith('javascript:')) {
                                src = src.substr('javascript:'.length);
                            }
                            iframe.addEventListener('load', function () {
                                // iframe.contentWindow.eval(`console.log('h00k iframe, script executed here');`);
                                (iframe.contentWindow as any).eval(src);
                            }, true);
                        } catch (ex) {
                            // console.warn('h00k iframe, contentWindow error', ex);
                        }
                    }
                }
                return result;
            },
        });
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
