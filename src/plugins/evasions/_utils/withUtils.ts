import { Serializable } from 'puppeteer';
import { PuppeteerExtraPlugin } from 'puppeteer-extra';
import { PuppeteerPage } from 'puppeteer-extra-plugin';
import utils from './'

interface EvaluateArgs {
    _utilsFns: { [key: string]: string }; // Map of function name => string content of utils.js
    _mainFunction: string;
    _args: readonly Serializable[];
}

const fnc = (ctxt: EvaluateArgs) => {
    const { _utilsFns, _mainFunction, _args } = ctxt;
    // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
    const asArray = Object.entries(_utilsFns);
    const evaluated = asArray.map(([key, value]) => [key, eval(value as string)]);
    const utils = Object.fromEntries(evaluated);
    utils.init();
    return eval(_mainFunction)(utils, ..._args);
}

/**
 * Wrap a page with utilities.
 *
 * @param {PuppeteerExtraPlugin} plugin
 * @param {Page} page
 */
export const withUtils = (plugin: PuppeteerExtraPlugin, page: PuppeteerPage) => ({
    /**
     * Simple `page.evaluate` replacement to preload utils
     */
    evaluate: function (mainFunction: (uts: typeof utils, arg1: any[]) => any, ...args: any[]) {
        const ctxt: EvaluateArgs = {
            _utilsFns: utils.stringifyFns(utils),
            _mainFunction: mainFunction.toString(),
            _args: args,
        };
        return page.evaluate(fnc, ctxt as any);
    },
    /**
     * Simple `page.evaluateOnNewDocument` replacement to preload utils
     */
    // evaluateOnNewDocument: function (mainFunction: (uts: typeof utils) => any);
    evaluateOnNewDocument: function (mainFunction: (uts: typeof utils, ...args: any[]) => any, ...args: any[]) {
        const ctxt: EvaluateArgs = {
            _utilsFns: utils.stringifyFns(utils),
            _mainFunction: mainFunction.toString(),
            _args: args,
        };
        return page.evaluateOnNewDocument(fnc, ctxt as any);
    },
});

export default withUtils;
