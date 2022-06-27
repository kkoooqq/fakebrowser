import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
    proxyExportIP: string;
    myRealExportIP: string;
}


class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/webrtc' {
        return 'evasions/webrtc';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, {
            proxyExportIP: this.opts.proxyExportIP,
            myRealExportIP: this.opts.myRealExportIP,
        });
    }

    // SW does not support RTC
    // onServiceWorkerContent(jsContent) {
    //     return withWorkerUtils(this, jsContent).evaluate(this.mainFunction);
    // }

    mainFunction = (utils: typeof Utils, opts: PluginOptions) => {
        const {proxyExportIP, myRealExportIP} = opts;
        // RTCIceCandidate.prototype.candidate get function
        // RTCIceCandidate.prototype.address get function
        // RTCIceCandidate.prototype.toJSON value function
        // RTCSessionDescription.prototype.sdp get function
        // RTCSessionDescription.prototype.toJSON value function

        const fakeIPs = [myRealExportIP];

        if (!proxyExportIP || !fakeIPs || !fakeIPs.length) {
            return;
        }

        const _Reflect = utils.cache.Reflect;

        const replaceIps = (str: string) => {
            if (fakeIPs && proxyExportIP) {
                for (let fakeIP of fakeIPs) {
                    str = str.replace(new RegExp(fakeIP, 'g'), proxyExportIP);
                }
            }

            return str;
        };

        utils.replaceGetterWithProxy(RTCIceCandidate.prototype, 'candidate', {
            apply(target: any, thisArg: any, args: any[]) {
                const org = _Reflect.apply(target, thisArg, args);
                const dest = replaceIps(org);

                // console.log('!!! h00k RTCIceCandidate_prototype_candidate_get:' + org + ' dest:' + dest);

                return dest;
            },
        });

        utils.replaceGetterWithProxy(RTCIceCandidate.prototype, 'address', {
            apply(target: any, thisArg: any, args: any[]) {
                const org = _Reflect.apply(target, thisArg, args);
                const dest = replaceIps(org);

                // console.log('!!! h00k RTCIceCandidate_prototype_address_get:' + org + ' dest:' + dest);

                return dest;
            },
        });

        utils.replaceWithProxy(RTCIceCandidate.prototype, 'toJSON', {
            apply(target: any, thisArg: any, args: any[]) {
                const org = JSON.stringify(_Reflect.apply(target, thisArg, args));
                const dest = replaceIps(org);

                // console.log('!!! h00k RTCIceCandidate_prototype_toJSON_value:' + org + ' dest:' + dest);

                return JSON.parse(dest);
            },
        });

        utils.replaceGetterWithProxy(RTCSessionDescription.prototype, 'sdp', {
            apply(target: any, thisArg: any, args: any[]) {
                const org = _Reflect.apply(target, thisArg, args);
                const dest = replaceIps(org);

                // console.log('!!! h00k RTCSessionDescription_prototype_sdp_get:' + org + ' dest:' + dest);

                return dest;
            },
        });

        utils.replaceWithProxy(RTCSessionDescription.prototype, 'toJSON', {
            apply(target: any, thisArg: any, args: any[]) {
                const org = JSON.stringify(_Reflect.apply(target, thisArg, args));
                const dest = replaceIps(org);

                // console.log('!!! h00k RTCSessionDescription_prototype_toJSON_value:' + org + ' dest:' + dest);

                return JSON.parse(dest);
            },
        });
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
