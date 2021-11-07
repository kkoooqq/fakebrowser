// noinspection JSCheckFunctionSignatures

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/properties.getter';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts.data);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts.data);
    }

    mainFunction = (utils, data) => {
        /* Define variables */
        const kObjPlaceHolder = '_$obj!_//+_';
        const kObjUndefinedPlaceHolder = '_$obj!_undefined_//+_';

        const overwriteObjectProperties = function (obj, newPropValues, blackList) {
            if (!obj) {
                return;
            }

            for (const name in newPropValues) {
                if (blackList && blackList.includes(name)) {
                    continue;
                }

                // Check if the original has this property
                const desc = utils.cache.Prototype.Object.getOwnPropertyDescriptor(obj, name);
                if (!desc) {
                    // Does not exist, just exit
                    // console.warn('!!! Property not found:' + o.constructor.name + ' propertyKey:' + key);
                    continue;
                }

                let newPropValue = newPropValues[name];
                if (newPropValue === kObjUndefinedPlaceHolder) {
                    newPropValue = undefined;
                }

                if (newPropValue === kObjPlaceHolder) {
                    // If it contains attribute and has value, exit directly
                    continue;
                } else if ('undefined' == typeof newPropValue) {
                    // If empty, delete this property
                    delete obj[name];
                } else {
                    // Other value, direct assignment
                }

                let func = null;
                if ('undefined' !== typeof desc['value']) {
                    func = utils.replaceWithProxy;
                } else if ('undefined' !== typeof desc['get']) {
                    func = utils.replaceGetterWithProxy;
                } else {
                    if ('value' in desc) {
                        func = utils.replaceWithProxy;
                    } else if ('get' in desc) {
                        func = utils.replaceGetterWithProxy;
                    } else {
                        func = utils.replaceSetterWithProxy;
                    }
                }

                // Consider whether the check for undefined elsewhere contains
                if ('undefined' == typeof newPropValue) {
                    // TODO: Ignore this property
                    // utils.addIgnoreProperty(o, propertyKey);
                }

                func(obj, name, {
                    apply(target, thisArgs, args) {
                        utils.cache.Reflect.apply(target, thisArgs, args);
                        return newPropValue;
                    },
                });
            }
        };

        if ('undefined' !== typeof WorkerNavigator) {
            overwriteObjectProperties(WorkerNavigator.prototype, data.navigator);
        }

        if ('undefined' !== typeof Navigator) {
            overwriteObjectProperties(Navigator.prototype, data.navigator, ['userAgent']);
        }

        if ('undefined' !== typeof window) {
            overwriteObjectProperties(window, data.window, ['pageXOffset', 'pageYOffset']);
        }

        if ('undefined' !== typeof Document) {
            overwriteObjectProperties(Document.prototype, data.document);
        }

        if ('undefined' !== typeof HTMLBodyElement) {
            overwriteObjectProperties(HTMLBodyElement.prototype, data.body, ['clientWidth', 'clientHeight']);
        }

        if ('undefined' !== typeof Screen) {
            overwriteObjectProperties(Screen.prototype, data.screen);
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
