import { FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/mimeTypes' {
        return 'evasions/mimeTypes';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.mimeTypes);
    }

    mainFunction = (utils: typeof Utils, fakeMimeTypes: Array<{
        mimeType: string,
        audioPlayType: string,
        videoPlayType: string,
        mediaSource: boolean,
        mediaRecorder: boolean,
    }>) => {
        // const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        utils.replaceWithProxy(
            HTMLMediaElement.prototype,
            'canPlayType',
            {
                apply: function (target: any, thisArg, args) {
                    const orgResult = _Reflect.apply(target, thisArg, args);

                    if (!args || !args.length) {
                        return orgResult;
                    }

                    const type = args[0];
                    let trimmedType = type.trim();
                    if (trimmedType.endsWith(trimmedType)) {
                        trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                    }

                    // akamai uses Object.create(HTMLMediaElement.prototype) to create the abstract Object and test the types
                    // check this ObjectType and the type if matched or not
                    if (!trimmedType
                        || thisArg.constructor.name === 'HTMLMediaElement' // Object.create(HTMLMediaElement.prototype) sht
                        || thisArg.constructor.name === 'HTMLVideoElement' && !trimmedType.startsWith('video')
                        || thisArg.constructor.name === 'HTMLAudioElement' && !trimmedType.startsWith('audio')
                    ) {
                        return orgResult;
                    }

                    const mimeType = fakeMimeTypes.find(e => e.mimeType === trimmedType);
                    if (mimeType) {
                        if (thisArg instanceof HTMLVideoElement) {
                            return mimeType.videoPlayType;
                        } else if (thisArg instanceof HTMLAudioElement) {
                            return mimeType.audioPlayType;
                        }
                    } else {
                        return orgResult;
                    }
                },
            },
        );

        utils.replaceWithProxy(
            MediaSource,
            'isTypeSupported',
            {
                apply: function (target: any, thisArg, args) {
                    const orgResult = _Reflect.apply(target, thisArg, args);

                    if (!args || !args.length) {
                        return orgResult;
                    }

                    const type = args[0];
                    let trimmedType = type.trim();
                    if (trimmedType.endsWith(trimmedType)) {
                        trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                    }

                    const mimeType = fakeMimeTypes.find(e => e.mimeType === trimmedType);
                    if (mimeType) {
                        return mimeType.mediaSource;
                    } else {
                        return orgResult;
                    }
                },
            },
        );

        if ('undefined' !== typeof MediaRecorder) {
            utils.replaceWithProxy(
                MediaRecorder,
                'isTypeSupported',
                {
                    apply: function (target: any, thisArg: any, args: any[]) {
                        const orgResult = _Reflect.apply(target, thisArg, args);

                        if (!args || !args.length) {
                            return orgResult;
                        }

                        const type = args[0];
                        let trimmedType = type.trim();
                        if (trimmedType.endsWith(trimmedType)) {
                            trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                        }

                        const mimeType = fakeMimeTypes.find(e => e.mimeType === trimmedType);
                        if (mimeType) {
                            return mimeType.mediaRecorder;
                        } else {
                            return orgResult;
                        }
                    },
                },
            );
        }
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
