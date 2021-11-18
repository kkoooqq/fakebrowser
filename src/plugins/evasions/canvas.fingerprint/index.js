'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

// the results of toDataURL are not the same for the same OS version, same GPU, same chrome version:
// After looking at the source code for quite a while, I found that including png generation, LZ77 zlib compression, there are no random values,
// there may be an effect of libpng version number, but libpng is statically linked to chrome, no external dll call.
// so libpng version must be bound to chrome

// ImageDataBuffer::ToDataURL
// https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/platform/graphics/image_data_buffer.cc#L170
//
// ImageDataBuffer::EncodeImageInternal
// https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/platform/graphics/image_data_buffer.cc#L142
//
// ImageEncoder::Encode
// https://github.com/chromium/chromium/blob/master/third_party/blink/renderer/platform/image-encoders/image_encoder.cc#L28
//
// SkPngEncoder::Encode
// https://github.com/google/skia/blob/main/src/images/SkPngEncoder.cpp#L462
//
// // https://github.com/google/skia/blob/main/src/images/SkPngEncoder.cpp#L400
// std::unique_ptr<SkPngEncoderMgr> SkPngEncoderMgr::Make(SkWStream* stream) {
//     // https://github.com/glennrp/libpng/blob/master/pngwrite.c#L492
//     png_structp pngPtr =
//             png_create_write_struct(PNG_LIBPNG_VER_STRING, nullptr, sk_error_fn, nullptr);
//     if (!pngPtr) {
//         return nullptr;
//     }
//
//     // https://github.com/glennrp/libpng/blob/master/png.c#L353
//     png_infop infoPtr = png_create_info_struct(pngPtr);
//     if (!infoPtr) {
//         png_destroy_write_struct(&pngPtr, nullptr);
//         return nullptr;
//     }
//
//     // sk_write_fn: https://github.com/google/skia/blob/main/src/images/SkPngEncoder.cpp#L41
//     png_set_write_fn(pngPtr, (void*)stream, sk_write_fn, nullptr);
//     return std::unique_ptr<SkPngEncoderMgr>(new SkPngEncoderMgr(pngPtr, infoPtr));
// }
//
//
//
// // https://github.com/google/skia/blob/main/src/images/SkPngEncoder.cpp#L435
// Make -> onEncodeRows -> for (png_write_rows) -> png_write_end
//
// png_write_rows
// https://github.com/glennrp/libpng/blob/master/pngwrite.c#L574
// https://github.com/glennrp/libpng/blob/master/pngwrite.c#L691
//
// png_write_start_row
// https://github.com/glennrp/libpng/blob/master/pngwutil.c#L1890
//
// png_write_end
// https://github.com/glennrp/libpng/blob/master/pngwrite.c#L358

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/canvas.fingerprint';
    }

    mainFunction = (utils, canvasSalt) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        // Define the following Context operations we need to add noise:
        const kNoiseOpers = [
            'createLinearGradient',
            'fillText',
            'scale',
            'strokeText',
            'transform',
            'arc',
            'arcTo',
            'bezierCurveTo',
            'ellipse',
            'lineTo',
            'quadraticCurveTo',
            'rotate',
        ];

        // Ready to hook
        let _OffscreenCanvas_prototype_getContext = null;
        let _HTMLCanvasElement_prototype_getContext = null;

        let _WebGLRenderingContext_prototype_readPixels = null;
        let _WebGL2RenderingContext_prototype_readPixels = null;
        let _OffscreenCanvasRenderingContext2D_prototype_getImageData = null;
        let _CanvasRenderingContext2D_prototype_getImageData = null;

        // The HTMLCanvas in the page and the OffscreenCanvas in the worker can be processed at the same time
        const classes = [];
        if ('undefined' !== typeof OffscreenCanvas) {
            classes.push({
                _Canvas: OffscreenCanvas,
                _CanvasRenderingContext2D: OffscreenCanvasRenderingContext2D,
                _Canvas_prototype_getContext: OffscreenCanvas.prototype.getContext,
                _Canvas_prototype_toDataURL: OffscreenCanvas.prototype.toDataURL,
            });

            _OffscreenCanvas_prototype_getContext = OffscreenCanvas.prototype.getContext;
            _OffscreenCanvasRenderingContext2D_prototype_getImageData = OffscreenCanvasRenderingContext2D.prototype.getImageData;
        }

        if ('undefined' !== typeof HTMLCanvasElement) {
            classes.push({
                _Canvas: HTMLCanvasElement,
                _CanvasRenderingContext2D: CanvasRenderingContext2D,
                _Canvas_prototype_getContext: HTMLCanvasElement.prototype.getContext,
                _Canvas_prototype_toDataURL: HTMLCanvasElement.prototype.toDataURL,
            });

            _HTMLCanvasElement_prototype_getContext = HTMLCanvasElement.prototype.getContext;
            _CanvasRenderingContext2D_prototype_getImageData = CanvasRenderingContext2D.prototype.getImageData;
        }

        if ('undefined' !== typeof WebGLRenderingContext) {
            _WebGLRenderingContext_prototype_readPixels = WebGLRenderingContext.prototype.readPixels;
        }

        if ('undefined' !== typeof WebGL2RenderingContext) {
            _WebGL2RenderingContext_prototype_readPixels = WebGL2RenderingContext.prototype.readPixels;
        }

        /**
         * Get the image data of the context
         * @param context
         * @returns {null}
         */
        const getContextImageUint8Data = (context) => {
            let result = null;
            const contextPrototype = _Object.getPrototypeOf(context);

            if (
                'undefined' !== typeof CanvasRenderingContext2D
                && contextPrototype === CanvasRenderingContext2D.prototype
            ) {
                // CanvasRenderingContext2D
                result = _CanvasRenderingContext2D_prototype_getImageData.call(
                    context,
                    0, 0,
                    context.canvas.width, context.canvas.height,
                ).data;
            } else if (
                'undefined' !== typeof OffscreenCanvasRenderingContext2D
                && contextPrototype === OffscreenCanvasRenderingContext2D.prototype
            ) {
                // OffscreenCanvasRenderingContext2D
                result = _OffscreenCanvasRenderingContext2D_prototype_getImageData.call(
                    context,
                    0, 0,
                    context.canvas.width, context.canvas.height,
                ).data;
            } else if (
                'undefined' !== typeof WebGLRenderingContext
                && contextPrototype === WebGLRenderingContext.prototype
            ) {
                // WebGLRenderingContext
                result = new Uint8ClampedArray(context.drawingBufferWidth * context.drawingBufferHeight * 4);

                _WebGLRenderingContext_prototype_readPixels.call(
                    context,
                    0,
                    0,
                    context.drawingBufferWidth,
                    context.drawingBufferHeight,
                    context.RGBA,
                    context.UNSIGNED_BYTE,
                    result);
            } else if (
                'undefined' !== typeof WebGL2RenderingContext
                && contextPrototype === WebGL2RenderingContext.prototype
            ) {
                // WebGL2RenderingContext
                result = new Uint8ClampedArray(context.drawingBufferWidth * context.drawingBufferHeight * 4);

                _WebGL2RenderingContext_prototype_readPixels.call(
                    context,
                    0,
                    0,
                    context.drawingBufferWidth,
                    context.drawingBufferHeight,
                    context.RGBA,
                    context.UNSIGNED_BYTE,
                    result);
            }

            return result;
        };

        // noinspection JSUnusedLocalSymbols
        for (const {
            _Canvas,
            _CanvasRenderingContext2D,
            _Canvas_prototype_getContext,
            _Canvas_prototype_toDataURL,
        } of classes) {
            // noinspection JSUnusedLocalSymbols
            utils.replaceWithProxy(_Canvas.prototype, 'getContext', {
                apply(target, thisArg, args) {
                    // noinspection JSUnusedLocalSymbols
                    const [contextId, options] = args;
                    const context = _Reflect.apply(target, thisArg, args);

                    // Whenever a program calls getContext, we cache the context and record the program's operations on the context.
                    utils.variables.renderingContextWithOperators.push({
                        canvas: thisArg,
                        context,
                        contextId,
                        operators: {},
                    });

                    // console.log('!!! h00k getContext context:' + (utils.variables.renderingContextWithOperators.length - 1) + ' args:' + Array.from(args).join('|'));

                    return context;
                },
            });

            // When making these calls, we record them and then add the noise at the end
            for (const noiseOper of kNoiseOpers) {
                utils.replaceWithProxy(_CanvasRenderingContext2D.prototype, noiseOper, {
                    apply(target, thisArg, args) {
                        utils.markRenderingContextOperator(thisArg, noiseOper);
                        return _Reflect.apply(target, thisArg, args);
                    },
                });
            }

            /**
             * Get the canvas with added noise
             * @param canvas
             * @returns {OffscreenCanvas|HTMLCanvasElement|*}
             */
            const getNoisifyCanvas = (canvas) => {
                const {
                    context: originalContext,
                    contextIndex,
                } = utils.findRenderingContextIndex(canvas);

                if (contextIndex < 0) {
                    return canvas;
                }

                // if there is a operator that needs to add noise
                const context = utils.variables.renderingContextWithOperators[contextIndex];

                // If the context is webgl, or if it is a 2d canvas and a specific draw function is called, we need to add noise
                if (!(
                    (context.contextId === 'webgl' || context.contextId === 'experimental-webgl')
                    || (context.contextId === 'webgl2' || context.contextId === 'experimental-webgl2')
                    || Object.keys(context.operators).length !== 0
                )) {
                    return canvas;
                }

                // console.log('!!! h00k toDataURL toBlob getImageData context:' + contextIndex + JSON.stringify({
                //     contextId: context.contextId,
                //     context: context.operators,
                // }) + ' noise !');

                // Create a new canvas
                let canvasWithNoise =
                    _Object.getPrototypeOf(canvas) === (('undefined' !== typeof OffscreenCanvas) && OffscreenCanvas.prototype)
                        ? new OffscreenCanvas(canvas.width, canvas.height)
                        : document.createElement('canvas');

                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;

                canvasWithNoise.width = canvasWidth;
                canvasWithNoise.height = canvasHeight;

                let newContext =
                    _Object.getPrototypeOf(canvas) === (('undefined' !== typeof OffscreenCanvas) && OffscreenCanvas.prototype)
                        ? _OffscreenCanvas_prototype_getContext.call(canvasWithNoise, '2d')
                        : _HTMLCanvasElement_prototype_getContext.call(canvasWithNoise, '2d');

                // Get the original ImageData
                const imageUint8DataOriginal = getContextImageUint8Data(originalContext);
                const imageUint8Data = Uint8ClampedArray.from(imageUint8DataOriginal);

                let saltIndex = 0;
                for (let y = 0; y < canvasHeight - 1; y += 2) {
                    for (let x = 0; x < canvasWidth - 1; x += 2) {
                        const pos = y * canvasWidth + x;

                        //
                        // Top left,
                        // top right,
                        // bottom left,
                        // bottom right
                        // 4 pixel points
                        const
                            p00 = imageUint8DataOriginal[pos],
                            p01 = imageUint8DataOriginal[pos + 1];
                        const
                            p10 = imageUint8DataOriginal[pos + canvasWidth],
                            p11 = imageUint8DataOriginal[pos + canvasWidth + 1];

                        // The surrounding 4 pixels are not the same color before adding the noise.
                        if (p00 !== p01 || p00 !== p10 || p00 !== p11) {
                            const salt = canvasSalt[saltIndex];
                            imageUint8Data[pos] += salt;

                            ++saltIndex;
                            if (saltIndex >= canvasSalt.length) {
                                saltIndex = 0;
                            }
                        }
                    }
                }

                newContext.putImageData(new ImageData(imageUint8Data, canvasWidth, canvasHeight), 0, 0);

                return canvasWithNoise;
            };

            utils.replaceWithProxy(_Canvas.prototype, 'toDataURL', {
                apply(target, thisArg, args) {
                    let canvas = thisArg;

                    // noinspection JSUnusedLocalSymbols
                    const {context, contextIndex} = utils.findRenderingContextIndex(canvas);

                    if (contextIndex >= 0) {
                        canvas = getNoisifyCanvas(thisArg);
                    }

                    return _Reflect.apply(target, canvas, args);
                },
            });

            utils.replaceWithProxy(_Canvas.prototype, 'toBlob', {
                apply(target, thisArg, args) {
                    let canvas = thisArg;
                    const {contextIndex} = utils.findRenderingContextIndex(canvas);

                    if (contextIndex >= 0) {
                        canvas = getNoisifyCanvas(thisArg);
                    }

                    // console.log('!!! h00k context:' + contextIndex + (context ? JSON.stringify({
                    //     contextId: context.contextId,
                    //     context: context.operators,
                    // }) : '') + ' canvas toBlob args:' + Array.from(args).join('|'));

                    return _Reflect.apply(target, canvas, args);
                },
            });

            utils.replaceWithProxy(_Canvas.prototype, 'convertToBlob', {
                apply(target, thisArg, args) {
                    let canvas = thisArg;
                    const {contextIndex} = utils.findRenderingContextIndex(canvas);

                    if (contextIndex >= 0) {
                        canvas = getNoisifyCanvas(thisArg);
                    }

                    // console.log('!!! h00k context:' + contextIndex + (context ? JSON.stringify({
                    //     contextId: context.contextId,
                    //     context: context.operators,
                    // }) : '') + ' canvas convertToBlob args:' + Array.from(args).join('|'));

                    return _Reflect.apply(target, canvas, args);
                },
            });

            utils.replaceWithProxy(_CanvasRenderingContext2D.prototype, 'getImageData', {
                apply(target, thisArg, args) {
                    let context = thisArg;
                    const contextIndex = utils.variables.renderingContextWithOperators.findIndex(e => e.context === context);

                    if (contextIndex >= 0) {
                        // noinspection JSPotentiallyInvalidUsageOfClassThis
                        const newCanvas = getNoisifyCanvas(thisArg.canvas);
                        context = _Canvas_prototype_getContext.call(newCanvas, '2d');
                    }

                    // console.log('!!! h00k context:' + contextIndex + (context ? JSON.stringify({
                    //     contextId: context.contextId,
                    //     context: context.operators,
                    // }) : '') + ' canvas getImageData args:' + Array.from(args).join('|'));

                    return _Reflect.apply(target, context, args);
                },
            });
        }
    };

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.canvasSalt);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.canvasSalt);
    }
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};

