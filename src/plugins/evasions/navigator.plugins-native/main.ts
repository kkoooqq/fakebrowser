import { DeviceDescriptorPlugins, DeviceDescriptorPluginsMimeTypes, DeviceDescriptorPluginsPlugins } from 'core/DeviceDescriptor';
import { internalPluginOptions } from '.';
import Utils from '../_utils/'

export const mainFunction = (utils: typeof Utils, opts: internalPluginOptions) => {
    const {chromeMajorVersion, fakePlugins} = opts;
    // TODO overwrite navigator.plugins[0].constructor.name

    const isInteger = (value: any): boolean => {
        const type = typeof (value);
        return (type === 'number' || (type === 'string' && !isNaN(value as unknown as number)))
    }

    // const kPluginsLessThen93: KPlugins = {
    //     mimeTypes: [
    //         {
    //             type: 'application/pdf',
    //             suffixes: 'pdf',
    //             description: '',
    //             __pluginName: 'Chrome PDF Viewer',
    //         },
    //         {
    //             type: 'application/x-google-chrome-pdf',
    //             suffixes: 'pdf',
    //             description: 'Portable Document Format',
    //             __pluginName: 'Chrome PDF Plugin',
    //         },
    //         {
    //             type: 'application/x-nacl',
    //             suffixes: '',
    //             description: 'Native Client Executable',
    //             __pluginName: 'Native Client',
    //         },
    //         {
    //             type: 'application/x-pnacl',
    //             suffixes: '',
    //             description: 'Portable Native Client Executable',
    //             __pluginName: 'Native Client',
    //         },
    //     ],
    //     plugins: [
    //         {
    //             name: 'Chrome PDF Plugin',
    //             filename: 'internal-pdf-viewer',
    //             description: 'Portable Document Format',
    //             __mimeTypes: [
    //                 'application/x-google-chrome-pdf',
    //             ],
    //         },
    //         {
    //             name: 'Chrome PDF Viewer',
    //             filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
    //             description: '',
    //             __mimeTypes: [
    //                 'application/pdf',
    //             ],
    //         },
    //         {
    //             name: 'Native Client',
    //             filename: 'internal-nacl-plugin',
    //             description: '',
    //             __mimeTypes: [
    //                 'application/x-nacl',
    //                 'application/x-pnacl',
    //             ],
    //         },
    //     ],
    // };

    const kPluginsGreaterThen93: DeviceDescriptorPlugins = {
        mimeTypes: [
            {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                __pluginName: 'PDF Viewer',
            },
            {
                type: 'text/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                __pluginName: 'PDF Viewer',
            },
        ],
        plugins: [
            {
                name: 'PDF Viewer',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
                __mimeTypes: ['application/pdf', 'text/pdf'],
            },
            {
                name: 'Chrome PDF Viewer',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
                __mimeTypes: ['application/pdf', 'text/pdf'],
            },
            {
                name: 'Chromium PDF Viewer',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
                __mimeTypes: ['application/pdf', 'text/pdf'],
            },
            {
                name: 'Microsoft Edge PDF Viewer',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
                __mimeTypes: ['application/pdf', 'text/pdf'],
            },
            {
                name: 'WebKit built-in PDF',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format',
                __mimeTypes: ['application/pdf', 'text/pdf'],
            },
        ],
    };

    const pluginsData: DeviceDescriptorPlugins =
        chromeMajorVersion > 93
            ? kPluginsGreaterThen93
            : fakePlugins;

    const _Object = utils.cache.Object;
    const _Reflect = utils.cache.Reflect;
    // const _origPlugins = utils.cache.window.navigator.plugins;
    // const _origMimeTypes = utils.cache.window.navigator.mimeTypes;

    // object correlations
    // pluginsData.plugins => pluginsCorr
    // pluginsData.mimes => mimeTypesCorr
    const pluginCorrs: Array<{ nativePlugin: string, nativePluginInner: string, pluginData: DeviceDescriptorPluginsPlugins}> = [];
    const mimeTypeCorrs: Array<{nativeMimeType: string, mimeTypeData: DeviceDescriptorPluginsMimeTypes, enabledPlugin: any}> = [];

    const nativePluginArray: PluginArray = _Object.create(PluginArray.prototype);
    const nativeMimeTypeArray: MimeTypeArray = _Object.create(MimeTypeArray.prototype);

    const makeNativeMimeType = (mimeType: string, bindNativePlugin: any) => {
        const mimeTypeData = pluginsData.mimeTypes.find(
            e => e.type === mimeType,
        );

        if (!mimeTypeData)
            throw Error('inconsistent browser plugin data, mimeType: ' + mimeType + ' is missing');

        
        // always make new native object
        const nativeMimeType = _Object.create(MimeType.prototype);
        mimeTypeCorrs.push({
            nativeMimeType,
            mimeTypeData,
            enabledPlugin: bindNativePlugin, // bind to the called plugin
        });

        return nativeMimeType;
    };

    // define plugin items
    let pluginCounter = 0;
    for (const pluginData of pluginsData.plugins) {
        const {
            name,
            // filename,
            // description,
            __mimeTypes,
        } = pluginData;

        const nativePluginInner = _Object.create(Plugin.prototype);

        // navigator.plugins[0][0] NOT EQUALS to navigator.plugins[0][0], weird!
        // needs to proxy it
        const nativePlugin = new Proxy(nativePluginInner, {
            get: (target, property: string, receiver) => {
                const orgResult = _Reflect.get(target, property, receiver);
                let mimeType = null;
                if (isInteger(property)) {
                    const mimeIndex = Number(property) % Math.pow(2, 32);
                    mimeType = __mimeTypes[mimeIndex];
                } else {
                    if (__mimeTypes.includes(property)) {
                        mimeType = property;
                    }
                }

                if (mimeType) {
                    // make new nativeMimeType
                    const nativeMimeType = makeNativeMimeType(mimeType, nativePlugin);
                    return nativeMimeType;
                }

                return orgResult;
            },
        });

        pluginCorrs.push({
            nativePlugin,
            nativePluginInner,
            pluginData,
        });

        // define own properties of nativePluginArray
        // Object.getOwnPropertyNames(navigator.plugins)
        // including index, plugin name

        // index
        _Object.defineProperty(nativePluginArray, '' + pluginCounter, {
            configurable: true,
            enumerable: true,
            value: nativePlugin,
            writable: false,
        });
        // plugin name
        _Object.defineProperty(nativePluginArray, name, {
            configurable: true,
            enumerable: false,
            value: nativePlugin,
            writable: false,
        });
        ++pluginCounter;
    }

    // define mimetype items
    let mimeTypeCounter = 0;
    for (const mimeTypeData of pluginsData.mimeTypes) {
        const {
            type,
            // suffixes,
            // description,
            __pluginName,
        } = mimeTypeData;

        const pluginCorr = pluginCorrs.find(
            e => e.pluginData.name === __pluginName,
        );
        if (!pluginCorr)
            throw Error(`can not find pluginCorrs named: ${__pluginName}`);
        const nativeMimeType = makeNativeMimeType(type, pluginCorr.nativePlugin);
        // index
        _Object.defineProperty(nativeMimeTypeArray, '' + mimeTypeCounter, {
            configurable: true,
            enumerable: true,
            value: nativeMimeType,
            writable: false,
        });
        // plugin name
        _Object.defineProperty(nativeMimeTypeArray, type, {
            configurable: true,
            enumerable: false,
            value: nativeMimeType,
            writable: false,
        });
        ++mimeTypeCounter;
    }

    // define mimetypes of each native plugin object
    // like: Object.getOwnPropertyDescriptors(navigator.plugins[0])
    for (const {nativePluginInner, pluginData} of pluginCorrs) {
        const {__mimeTypes} = pluginData;

        for (let n = 0; n < __mimeTypes.length; ++n) {
            const mimeType = __mimeTypes[n];
            const nativeMimeType = mimeTypeCorrs.find(
                e => e.mimeTypeData.type === mimeType,
            )!.nativeMimeType;

            _Object.defineProperty(nativePluginInner, '' + n, {
                configurable: true,
                enumerable: true,
                value: nativeMimeType,
                writable: false,
            });

            // plugin name
            _Object.defineProperty(nativePluginInner, mimeType, {
                configurable: true,
                enumerable: false,
                value: nativeMimeType,
                writable: false,
            });
        }
    }

    // ====================
    // following code starts hooking the properties and methods of each prototype
    // ====================

    // PluginArray.prototype.item
    utils.replaceWithProxy(PluginArray.prototype, 'item', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativePluginArray) {
                    throw utils.patchError(ex as Error, 'item');
                }
            }
            if (thisArg === nativePluginArray) {
                const index = isInteger(args[0]) ? Number(args[0]) % Math.pow(2, 32) : 0;
                // never returns `undefined`
                if (index < 0 || index >= pluginCorrs.length) {
                    return null;
                }
                return pluginCorrs[index].nativePlugin;
            }
            return orgResult;
        },
    });

    // PluginArray.prototype.length
    utils.replaceGetterWithProxy(PluginArray.prototype, 'length', {
        apply(target, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                // dirty FIX
                if (thisArg === nativePluginArray) {
                    return pluginsData.plugins.length;
                }
                if (thisArg !== nativePluginArray) {
                    throw utils.patchError(ex as Error, 'length');
                }
            }
            if (thisArg === nativePluginArray) {
                return pluginsData.plugins.length;
            }
            return orgResult;
        },
    });

    // PluginArray.prototype.namedItem
    utils.replaceWithProxy(PluginArray.prototype, 'namedItem', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativePluginArray) {
                    throw utils.patchError(ex as Error, 'namedItem');
                }
            }
            if (thisArg === nativePluginArray) {
                const name = args[0];
                const pluginCorr = pluginCorrs.find(e => e.pluginData.name === name);

                if (!pluginCorr) {
                    return null;
                }
                return pluginCorr.nativePlugin;
            }
            return orgResult;
        },
    });

    // PluginArray.prototype.refresh
    utils.replaceWithProxy(PluginArray.prototype, 'refresh', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativePluginArray) {
                    throw utils.patchError(ex as Error, 'refresh');
                }
            }
            if (thisArg === nativePluginArray) {
                return undefined;
            }
            return orgResult;
        },
    });

    // PluginArray.prototype.Symbol.iterator
    utils.replaceWithProxy(PluginArray.prototype, Symbol.iterator, {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativePluginArray) {
                    throw utils.patchError(ex as Error, 'Symbol.iterator');
                }
            }
            if (thisArg === nativePluginArray) {
                const nativePluginObjs = pluginCorrs.map(e => e.nativePlugin);
                return nativePluginObjs[Symbol.iterator].bind(nativePluginObjs)();
            }
            return orgResult;
        },
    });

    // MimeTypeArray.prototype.item
    utils.replaceWithProxy(MimeTypeArray.prototype, 'item', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativeMimeTypeArray) {
                    throw utils.patchError(ex as Error, 'item');
                }
            }
            if (thisArg === nativeMimeTypeArray) {
                const index = isInteger(args[0]) ? Number(args[0]) % Math.pow(2, 32) : 0;
                if (index < 0 || index >= mimeTypeCorrs.length) {
                    return null;
                }
                return mimeTypeCorrs[index].nativeMimeType;
            }
            return orgResult;
        },
    });

    // MimeTypeArray.prototype.length
    utils.replaceGetterWithProxy(MimeTypeArray.prototype, 'length', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativeMimeTypeArray) {
                    throw utils.patchError(ex as Error, 'length');
                }
            }
            if (thisArg === nativeMimeTypeArray) {
                return pluginsData.mimeTypes.length;
            }
            return orgResult;
        },
    });

    // MimeTypeArray.prototype.namedItem
    utils.replaceWithProxy(MimeTypeArray.prototype, 'namedItem', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativeMimeTypeArray) {
                    throw utils.patchError(ex as Error, 'namedItem');
                }
            }
            if (thisArg === nativeMimeTypeArray) {
                const type = args[0];
                const mimeTypeCorr = mimeTypeCorrs.find(e => e.mimeTypeData.type === type);

                if (!mimeTypeCorr) {
                    return null;
                }
                return mimeTypeCorr.nativeMimeType;
            }
            return orgResult;
        },
    });

    // MimeTypeArray.prototype.Symbol.iterator
    utils.replaceWithProxy(MimeTypeArray.prototype, Symbol.iterator, {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg !== nativeMimeTypeArray) {
                    throw utils.patchError(ex as Error, 'Symbol.iterator');
                }
            }
            if (thisArg === nativeMimeTypeArray) {
                const nativeMimeTypeObjs = mimeTypeCorrs.map(e => e.nativeMimeType);
                return nativeMimeTypeObjs[Symbol.iterator].bind(nativeMimeTypeObjs)();
            }
            return orgResult;
        },
    });

    // Plugin.prototype.description.get
    // do not See the correct Plugin object cast as any
    utils.replaceGetterWithProxy(Plugin.prototype, 'description', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'description');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                return pluginCorr.pluginData.description;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.filename.get
    utils.replaceGetterWithProxy(Plugin.prototype, 'filename', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'filename');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                return pluginCorr.pluginData.filename;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.item.value
    // do not See the correct Plugin object cast as any
    utils.replaceWithProxy(Plugin.prototype, 'item', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'item');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                const index = isInteger(args[0]) ? Number(args[0]) % Math.pow(2, 32) : 0;
                if (index < 0 || index >= pluginCorr.pluginData.__mimeTypes.length) {
                    return null;
                }
                const mimeType = pluginCorr.pluginData.__mimeTypes[index];
                const nativeMimeType = makeNativeMimeType(mimeType, thisArg);
                return nativeMimeType;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.length.get
    utils.replaceGetterWithProxy(Plugin.prototype, 'length', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'length');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                return pluginCorr.pluginData.__mimeTypes.length;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.name.get
    utils.replaceGetterWithProxy(Plugin.prototype, 'name', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'name');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                return pluginCorr.pluginData.name;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.namedItem.value
    // do not See the correct Plugin object cast as any
    utils.replaceWithProxy(Plugin.prototype, 'namedItem', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'namedItem');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                const mimeType = args[0];
                if (!pluginCorr.pluginData.__mimeTypes.includes(mimeType)) {
                    return null;
                }
                const nativeMimeType = makeNativeMimeType(mimeType, thisArg);
                return nativeMimeType;
            }
            return orgResult;
        },
    });

    // Plugin.prototype.[Symbol.iterator].value
    // do not See the correct Plugin object cast as any
    utils.replaceWithProxy(Plugin.prototype, Symbol.iterator, {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === Plugin.prototype) {
                    throw utils.patchError(ex as Error, 'Symbol.iterator');
                }
            }
            const pluginCorr = pluginCorrs.find(e => e.nativePlugin === thisArg);
            if (pluginCorr) {
                const nativeMimeTypes = [];
                for (const mimeType of pluginCorr.pluginData.__mimeTypes) {
                    const nativeMimeType = makeNativeMimeType(mimeType, thisArg);
                    nativeMimeTypes.push(nativeMimeType);
                }
                return nativeMimeTypes[Symbol.iterator].bind(nativeMimeTypes)();
            }
            return orgResult;
        },
    });

    // MimeType.prototype.enabledPlugin.get
    utils.replaceGetterWithProxy(MimeType.prototype, 'enabledPlugin', {
        apply(target: any, thisArg, args) {
            let orgResult = null;
            try {
                orgResult = _Reflect.apply(target, thisArg, args);
            } catch (ex) {
                if (thisArg === MimeType.prototype) {
                    throw utils.patchError(ex as Error, 'enabledPlugin');
                }
            }
            const mimeTypeCorr = mimeTypeCorrs.find(e => e.nativeMimeType === thisArg);
            if (mimeTypeCorr) {
                return mimeTypeCorr.enabledPlugin;
            }
            return orgResult;
        },
    });

    // MimeType.prototype.(description|suffixes|type).get
    for (const field of ['suffixes', 'type', 'description'] as const)
        utils.replaceGetterWithProxy(MimeType.prototype, field, {
            apply(target: any, thisArg, args) {
                let orgResult = null;
                try {
                    orgResult = _Reflect.apply(target, thisArg, args);
                } catch (ex) {
                    if (thisArg === MimeType.prototype) {
                        throw utils.patchError(ex as Error, field);
                    }
                }
                const mimeTypeCorr = mimeTypeCorrs.find(e => e.nativeMimeType === thisArg);
                if (mimeTypeCorr) {
                    return mimeTypeCorr.mimeTypeData[field];
                }
                return orgResult;
            },
        });

    // final return results
    utils.replaceGetterWithProxy(Navigator.prototype, 'plugins', {
        apply(target: any, thisArg, args) {
            const orgResult = _Reflect.apply(target, thisArg, args);
            if (thisArg === utils.cache.window.navigator) {
                return nativePluginArray;
                // return _origPlugins;
            }
            return orgResult;
        },
    });

    utils.replaceGetterWithProxy(Navigator.prototype, 'mimeTypes', {
        apply(target: any, thisArg, args) {
            const orgResult = _Reflect.apply(target, thisArg, args);
            if (thisArg === utils.cache.window.navigator) {
                return nativeMimeTypeArray;
                // return _origMimeTypes;
            }
            return orgResult;
        },
    });
};
