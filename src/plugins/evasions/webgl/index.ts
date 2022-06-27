import { FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

interface ShadderCache {
    shaderPrecisionFormat: string,
    webglPropName: 'webgl' | 'webgl2',
    shaderType: number,
    precisionType: number,
    rangeMin: number,
    rangeMax: number,
    precision: number,
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/webgl' {
        return 'evasions/webgl';
    }

    /* global WebGLRenderingContext WebGL2RenderingContext */
    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, {
            gpu: this.opts.fakeDD.gpu,
            webgl: this.opts.fakeDD.webgl,
            webgl2: this.opts.fakeDD.webgl2,
        });
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, {
            gpu: this.opts.fakeDD.gpu,
            webgl: this.opts.fakeDD.webgl,
            webgl2: this.opts.fakeDD.webgl2,
        });
    }

    mainFunction = (utils: typeof Utils, fakeDD: FakeDeviceDescriptor) => {
        // const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        // shaderPrecisionFormat: shaderPrecisionFormat itself
        // webglPropName
        // shaderType
        // precisionType,
        // rangeMin
        // rangeMax
        // precision
        const shaderPrecisionFormats: ShadderCache[] = [];

        const WebGLShaderPrecisionFormat_prototype_rangeMin_get = utils.cache.Descriptor.WebGLShaderPrecisionFormat.prototype.rangeMin.get;
        const WebGLShaderPrecisionFormat_prototype_rangeMax_get = utils.cache.Descriptor.WebGLShaderPrecisionFormat.prototype.rangeMax.get;
        const WebGLShaderPrecisionFormat_prototype_precision_get = utils.cache.Descriptor.WebGLShaderPrecisionFormat.prototype.precision.get;

        const bindContext = (_WebGLRenderingContext: any, fakeDDPropName: 'webgl' | 'webgl2') => {
            // getParameter
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getParameter', {
                apply(target: any, thisArg, args: [number]) {
                    // We must call this primitive method, and akamai will listen to see if this primitive method is called
                    const orgResult = _Reflect.apply(target, thisArg, args);
                    const type = args[0];
                    let result = undefined;

                    switch (type) {
                        case 37445: /* renderer.UNMASKED_VENDOR_WEBGL */
                            result = fakeDD.gpu.vendor;
                            break;

                        case 37446: /* renderer.UNMASKED_RENDERER_WEBGL */
                            result = fakeDD.gpu.renderer;
                            break;

                        default:
                            const param = fakeDD[fakeDDPropName].params[type];
                            if (param) {
                                const paramValue = param.value;

                                if (paramValue && paramValue.constructor.name === 'Object') {
                                    const classType = param.type;
                                    // Float32Array, Int32Array, ...
                                    result = new utils.cache.global[classType](Object.values(paramValue));
                                } else {
                                    // including: null, number, string, array
                                    result = paramValue;
                                }
                            }

                            break;
                    }

                    if (result === undefined) {
                        result = orgResult;
                    }

                    return result;
                },
            });

            // noinspection JSUnusedLocalSymbols
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getSupportedExtensions', {
                apply(target: any, thisArg, args) {
                    _Reflect.apply(target, thisArg, args);
                    return fakeDD[fakeDDPropName].supportedExtensions;
                },
            });

            // getContextAttributes
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getContextAttributes', {
                apply(target: any, thisArg, args) {
                    const result = _Reflect.apply(target, thisArg, args);

                    result.alpha = fakeDD[fakeDDPropName].contextAttributes.alpha;
                    result.antialias = fakeDD[fakeDDPropName].contextAttributes.antialias;
                    result.depth = fakeDD[fakeDDPropName].contextAttributes.depth;
                    result.desynchronized = fakeDD[fakeDDPropName].contextAttributes.desynchronized;
                    result.failIfMajorPerformanceCaveat = fakeDD[fakeDDPropName].contextAttributes.failIfMajorPerformanceCaveat;
                    result.powerPreference = fakeDD[fakeDDPropName].contextAttributes.powerPreference;
                    result.premultipliedAlpha = fakeDD[fakeDDPropName].contextAttributes.premultipliedAlpha;
                    result.preserveDrawingBuffer = fakeDD[fakeDDPropName].contextAttributes.preserveDrawingBuffer;
                    result.stencil = fakeDD[fakeDDPropName].contextAttributes.stencil;
                    result.xrCompatible = fakeDD[fakeDDPropName].contextAttributes.xrCompatible;

                    return result;
                },
            });

            // getShaderPrecisionFormat
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getShaderPrecisionFormat', {
                apply(target: any, thisArg, args: any[]) {
                    const shaderPrecisionFormat = _Reflect.apply(target, thisArg, args);

                    shaderPrecisionFormats.push({
                        shaderPrecisionFormat,
                        webglPropName: fakeDDPropName,
                        shaderType: args[0],
                        precisionType: args[1],
                        rangeMin: WebGLShaderPrecisionFormat_prototype_rangeMin_get.call(shaderPrecisionFormat),
                        rangeMax: WebGLShaderPrecisionFormat_prototype_rangeMax_get.call(shaderPrecisionFormat),
                        precision: WebGLShaderPrecisionFormat_prototype_precision_get.call(shaderPrecisionFormat),
                    });

                    return shaderPrecisionFormat;
                },
            });
        };

        // WebGLRenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL;
        bindContext(WebGLRenderingContext, 'webgl');
        bindContext(WebGL2RenderingContext, 'webgl2');

        // WebGLShaderPrecisionFormat
        // noinspection JSUnusedLocalSymbols
        utils.replaceGetterWithProxy(WebGLShaderPrecisionFormat.prototype, 'precision', {
            apply(target, thisArg, args) {
                _Reflect.apply(target, thisArg, args);

                const r = shaderPrecisionFormats.find(
                    e => e.shaderPrecisionFormat === thisArg,
                );

                // webglPropName
                // shaderType
                // precisionType,
                // rangeMin
                // rangeMax
                // precision
                const {
                    webglPropName,
                    shaderType,
                    precisionType,
                    rangeMin,
                    rangeMax,
                    precision,
                } = r!;

                const fake_r = fakeDD[webglPropName].shaderPrecisionFormats.find(
                    e => e.shaderType === shaderType
                        && e.precisionType === precisionType,
                );

                const result = fake_r ? fake_r.r.precision : precisionType;
                return result;
            },
        });

        // noinspection JSUnusedLocalSymbols
        utils.replaceGetterWithProxy(WebGLShaderPrecisionFormat.prototype, 'rangeMin', {
            apply(target, thisArg, args) {
                _Reflect.apply(target, thisArg, args);

                const r = shaderPrecisionFormats.find(
                    e => e.shaderPrecisionFormat === thisArg,
                );

                const {
                    webglPropName,
                    shaderType,
                    precisionType,
                    rangeMin,
                    rangeMax,
                    precision,
                } = r!;

                const fake_r = fakeDD[webglPropName].shaderPrecisionFormats.find(
                    e => e.shaderType === shaderType
                        && e.precisionType === precisionType,
                );

                const result = fake_r ? fake_r.r.rangeMin : rangeMin;
                return result;
            },
        });

        // noinspection JSUnusedLocalSymbols
        utils.replaceGetterWithProxy(WebGLShaderPrecisionFormat.prototype, 'rangeMax', {
            apply(target, thisArg, args) {
                _Reflect.apply(target, thisArg, args);

                const r = shaderPrecisionFormats.find(
                    e => e.shaderPrecisionFormat === thisArg,
                );

                const {
                    webglPropName,
                    shaderType,
                    precisionType,
                    rangeMin,
                    rangeMax,
                    precision,
                } = r!;

                const fake_r = fakeDD[webglPropName].shaderPrecisionFormats.find(
                    e => e.shaderType === shaderType
                        && e.precisionType === precisionType,
                );

                const result = fake_r ? fake_r.r.rangeMax : rangeMax;
                return result;
            },
        });
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
