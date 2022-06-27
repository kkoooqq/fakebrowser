import { PuppeteerPage } from 'puppeteer-extra-plugin';
import utils from './'

interface EvaluateArgs {
    _utilsFns: (fnObj?: { [key: string]: Function | any }) => { [key: string]: string };
    _mainFunction: string;
    _args : any[];
}


interface EvaluateOnNewDocumentArgs {
    _utilsFns: (fnObj?: { [key: string]: Function | any }) => { [key: string]: string };
    _mainFunction: string;
    _args : any[];
    _pluginName: string;
}

/**
 * Wrap a page with utilities.
 *
 * @param {PuppeteerExtraPlugin} plugin
 * @param {Page} page
 */
 export const withUtils = (plugin: any, page: PuppeteerPage) => ({
    /**
     * Simple `page.evaluate` replacement to preload utils
     */
    evaluate: function (mainFunction: Function, ...args: any[]) {
        return page.evaluate(
            (ctxt: EvaluateArgs) => {
                const {_utilsFns, _mainFunction, _args} = ctxt;
                // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
                const utils = Object.fromEntries(
                    Object.entries(_utilsFns).map(([key, value]) => [key, eval(value as string)]), // eslint-disable-line no-eval
                );

                utils.init();
                return eval(_mainFunction)(utils, ..._args); // eslint-disable-line no-eval
            },
            {
                _utilsFns: utils.stringifyFns(utils),
                _mainFunction: mainFunction.toString(),
                _args: args || [],
            },
        );
    },
    /**
     * Simple `page.evaluateOnNewDocument` replacement to preload utils
     */
    evaluateOnNewDocument: function (mainFunction: any, ...args: any[]) {
        return page.evaluateOnNewDocument(
            (ctxt: EvaluateOnNewDocumentArgs) => {
                const { _utilsFns, _mainFunction, _args } = ctxt;
                // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
                const utils = Object.fromEntries(
                    Object.entries(_utilsFns).map(
                        ([key, value]) => [key, eval(value as any)],
                    ), // eslint-disable-line no-eval
                );
                utils.init();
                return eval(_mainFunction)(utils, ..._args); // eslint-disable-line no-eval
            },
            {
                _utilsFns: utils.stringifyFns(utils),
                _mainFunction: mainFunction.toString(),
                _args: args || [],
                _pluginName: plugin.name,
            },
        );
    },
});

export default withUtils;
