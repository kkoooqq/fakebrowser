// import { utils } from './'

import { PuppeteerExtraPlugin } from "puppeteer-extra";

export const withWorkerUtils = (plugin: PuppeteerExtraPlugin, jsContent: string) => ({
    evaluate: async function (mainFunction: Function, ...args: any[]): Promise<string> {
        const thisJsContent = `
(function() {
    const mainFunction = ${mainFunction.toString()};
    mainFunction(utils, ${args ? args.map(e => JSON.stringify(e)).join(', ') : 'undefined'});            
})(); 
`;
        return `${thisJsContent} \n ${jsContent}`;
    },
});

export default withWorkerUtils;
