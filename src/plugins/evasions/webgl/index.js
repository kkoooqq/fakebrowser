'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/webgl';
    }

    /* global WebGLRenderingContext WebGL2RenderingContext */
    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts);
    }

    mainFunction = (utils, data) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        const shaderPrecisionFormats = [];
        const WebGLShaderPrecisionFormat_prototype_rangeMin_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'rangeMin').get;
        const WebGLShaderPrecisionFormat_prototype_rangeMax_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'rangeMax').get;
        const WebGLShaderPrecisionFormat_prototype_precision_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'precision').get;

        const bindContext = (_WebGLRenderingContext, propName) => {
            // getParameter
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getParameter', {
                apply(target, thisArg, args) {
                    const type = args[0];
                    let result = undefined;

                    switch (type) {
                        case 37445: /* renderer.UNMASKED_VENDOR_WEBGL */
                            result = data.gpu.vendor;
                            break;

                        case 37446: /* renderer.UNMASKED_RENDERER_WEBGL */
                            result = data.gpu.renderer;
                            break;

                        default:
                            const param = data[propName].params[type];
                            if (param) {
                                const paramValue = param.value;

                                if (paramValue && paramValue.constructor.name === 'Object') {
                                    const classType = param.type;
                                    // Float32Array, Int32Array, ...
                                    result = new window[classType]();

                                    for (const [key, value] of Object.entries(paramValue)) {
                                        result[key] = value;
                                    }
                                } else {
                                    // including: null, number, string, array
                                    result = paramValue;
                                }
                            }

                            break;
                    }

                    if (result === undefined) {
                        const orgResult = _Reflect.apply(target, thisArg, args);
                        result = orgResult;
                    }

                    return result;
                },
            });

            // noinspection JSUnusedLocalSymbols
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getSupportedExtensions', {
                apply(target, thisArg, args) {
                    return data[propName].supportedExtensions;
                },
            });

            // getContextAttributes
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getContextAttributes', {
                apply(target, thisArg, args) {
                    const result = _Reflect.apply(target, thisArg, args);

                    result.alpha = data[propName].contextAttributes.alpha;
                    result.antialias = data[propName].contextAttributes.antialias;
                    result.depth = data[propName].contextAttributes.depth;
                    result.desynchronized = data[propName].contextAttributes.desynchronized;
                    result.failIfMajorPerformanceCaveat = data[propName].contextAttributes.failIfMajorPerformanceCaveat;
                    result.powerPreference = data[propName].contextAttributes.powerPreference;
                    result.premultipliedAlpha = data[propName].contextAttributes.premultipliedAlpha;
                    result.preserveDrawingBuffer = data[propName].contextAttributes.preserveDrawingBuffer;
                    result.stencil = data[propName].contextAttributes.stencil;
                    result.xrCompatible = data[propName].contextAttributes.xrCompatible;

                    return result;
                },
            });

            // getShaderPrecisionFormat
            utils.replaceWithProxy(_WebGLRenderingContext.prototype, 'getShaderPrecisionFormat', {
                apply(target, thisArg, args) {
                    const shaderPrecisionFormat = _Reflect.apply(target, thisArg, args);

                    shaderPrecisionFormats.push({
                        shaderPrecisionFormat,
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
                const r = shaderPrecisionFormats.find(e => e.shaderPrecisionFormat === thisArg);
                const fake_r = data.webgl.shaderPrecisionFormats.find(e => e.shaderType === r.shaderType && e.precisionType === r.precisionType);
                let result = fake_r ? fake_r.r.precision : r.precision;

                // console.log('!!!h00k ShaderPrecisionFormat precision:' + r.precision + ' to:' + result);

                return result;
            },
        });

        // noinspection JSUnusedLocalSymbols
        utils.replaceGetterWithProxy(WebGLShaderPrecisionFormat.prototype, 'rangeMin', {
            apply(target, thisArg, args) {
                const r = shaderPrecisionFormats.find(e => e.shaderPrecisionFormat === thisArg);
                const fake_r = data.webgl.shaderPrecisionFormats.find(e => e.shaderType === r.shaderType && e.precisionType === r.precisionType);
                let result = fake_r ? fake_r.r.rangeMin : r.rangeMin;

                // console.log('!!!h00k ShaderPrecisionFormat rangeMin:' + r.rangeMin + ' to:' + result);

                return result;
            },
        });

        // noinspection JSUnusedLocalSymbols
        utils.replaceGetterWithProxy(WebGLShaderPrecisionFormat.prototype, 'rangeMax', {
            apply(target, thisArg, args) {
                const r = shaderPrecisionFormats.find(e => e.shaderPrecisionFormat === thisArg);
                const fake_r = data.webgl.shaderPrecisionFormats.find(e => e.shaderType === r.shaderType && e.precisionType === r.precisionType);
                let result = fake_r ? fake_r.r.rangeMax : r.rangeMax;

                // console.log('!!!h00k ShaderPrecisionFormat rangeMax:' + r.rangeMax + ' to:' + result);

                return result;
            },
        });
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
