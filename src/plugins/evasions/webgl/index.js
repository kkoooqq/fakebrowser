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
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts.data);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts.data);
    }

    mainFunction = (utils, data) => {
        const _Object = utils.cache.Prototype.Object;

        const shaderPrecisionFormats = [];
        const WebGLShaderPrecisionFormat_prototype_rangeMin_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'rangeMin').get;
        const WebGLShaderPrecisionFormat_prototype_rangeMax_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'rangeMax').get;
        const WebGLShaderPrecisionFormat_prototype_precision_get = _Object.getOwnPropertyDescriptor(WebGLShaderPrecisionFormat.prototype, 'precision').get;

        const bindContext = (obj) => {
            // getParameter
            utils.replaceWithProxy(obj.prototype, 'getParameter', {
                apply(target, thisArg, args) {
                    // console.log('webgl getParameter' + args[0]);

                    switch (args[0]) {
                        case 37445: /* renderer.UNMASKED_VENDOR_WEBGL */
                            return data.gpu.vendor;

                        case 37446: /* renderer.UNMASKED_RENDERER_WEBGL */
                            return data.gpu.renderer;

                        case 34047: /* ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT */
                            return data.webgl.maxAnisotropy;

                        case 3412: // webgl.BLUE_BITS
                            return data.webgl.blueBits;

                        case 3414: // webgl.DEPTH_BITS
                            return data.webgl.depthBits;

                        case 3411: // webgl.GREEN_BITS
                            return data.webgl.greenBits;

                        case 35661: // webgl.MAX_COMBINED_TEXTURE_IMAGE_UNITS
                            return data.webgl.maxCombinedTextureImageUnits;

                        case 34076: // webgl.MAX_CUBE_MAP_TEXTURE_SIZE
                            return data.webgl.maxCubeMapTextureSize;

                        case 36349: // webgl.MAX_FRAGMENT_UNIFORM_VECTORS
                            return data.webgl.maxFragmentUniformVectors;

                        case 34024: // webgl.MAX_RENDERBUFFER_SIZE
                            return data.webgl.maxRenderbufferSize;

                        case 34930: // webgl.MAX_TEXTURE_IMAGE_UNITS
                            return data.webgl.maxTextureImageUnits;

                        case 3379: // webgl.MAX_TEXTURE_SIZE
                            return data.webgl.maxTextureSize;

                        case 36348: // webgl.MAX_VARYING_VECTORS
                            return data.webgl.maxVaryingVectors;

                        case 34921: // webgl.MAX_VERTEX_ATTRIBS
                            return data.webgl.maxVertexAttribs;

                        case 35660: // webgl.MAX_VERTEX_TEXTURE_IMAGE_UNITS
                            return data.webgl.maxVertexTextureImageUnits;

                        case 36347: // webgl.MAX_VERTEX_UNIFORM_VECTORS
                            return data.webgl.maxVertexUniformVectors;

                        case 35724: // webgl.SHADING_LANGUAGE_VERSION
                            return data.webgl.shadingLanguageVersion;

                        case 3415: // webgl.STENCIL_BITS
                            return data.webgl.stencilBits;

                        case 7938: // webgl.VERSION
                            return data.webgl.version;

                        case 33902: // aliasedLineWidthRange
                            if (data.webgl.aliasedLineWidthRange) {
                                return _Object.values(data.webgl.aliasedLineWidthRange);
                            }
                            break;

                        case 33901: // aliasedPointSizeRange
                            if (data.webgl.aliasedPointSizeRange) {
                                return _Object.values(data.webgl.aliasedPointSizeRange);
                            }
                            break;

                        case 3386: // maxViewportDims
                            if (data.webgl.maxViewportDims) {
                                return _Object.values(data.webgl.maxViewportDims);
                            }
                            break;

                        case 3413: // alphaBits
                            if (data.webgl.alphaBits) {
                                return data.webgl.alphaBits;
                            }
                            break;

                        case 3410: // redBits
                            if (data.webgl.redBits) {
                                return data.webgl.redBits;
                            }
                            break;

                        case 7937: // renderer
                            if (data.webgl.renderer) {
                                return data.webgl.renderer;
                            }
                            break;

                        case 7936: // vendor
                            if (data.webgl.vendor) {
                                return data.webgl.vendor;
                            }
                            break;

                        default:
                            break;
                    }

                    return utils.cache.Reflect.apply(target, thisArg, args);
                },
            });

            // noinspection JSUnusedLocalSymbols
            utils.replaceWithProxy(obj.prototype, 'getSupportedExtensions', {
                apply(target, thisArg, args) {
                    return data.webgl.supportedExtensions;
                },
            });

            // getContextAttributes
            utils.replaceWithProxy(obj.prototype, 'getContextAttributes', {
                apply(target, thisArg, args) {
                    const result = utils.cache.Reflect.apply(target, thisArg, args);

                    result.alpha = data.webgl.alpha;
                    result.antialias = data.webgl.antialias;
                    result.depth = data.webgl.depth;
                    result.desynchronized = data.webgl.desynchronized;
                    result.failIfMajorPerformanceCaveat = data.webgl.failIfMajorPerformanceCaveat;
                    result.powerPreference = data.webgl.powerPreference;
                    result.premultipliedAlpha = data.webgl.premultipliedAlpha;
                    result.preserveDrawingBuffer = data.webgl.preserveDrawingBuffer;
                    result.stencil = data.webgl.stencil;
                    result.xrCompatible = data.webgl.xrCompatible;

                    return result;
                },
            });

            // getShaderPrecisionFormat
            utils.replaceWithProxy(obj.prototype, 'getShaderPrecisionFormat', {
                apply(target, thisArg, args) {
                    const shaderPrecisionFormat = utils.cache.Reflect.apply(target, thisArg, args);

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
        bindContext(WebGLRenderingContext);
        bindContext(WebGL2RenderingContext);

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
