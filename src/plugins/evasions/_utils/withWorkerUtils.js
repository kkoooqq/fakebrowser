const utils = require('./index');

module.exports = (jsContent) => ({
    evaluate: async function (mainFunction, ...args) {
        const thisJsContent =
`
(function() {
    const mainFunction = ${mainFunction.toString()};
    mainFunction(utils, ${args ? args.map(e => JSON.stringify(e)).join(', ') : 'undefined'});            
})();        
`;

        const result = `
${thisJsContent} 

// ========================================== 
// ========================================== 

${jsContent}`;

        return result;

        // return page.evaluateOnNewDocument(
        //     ({_utilsFns, _mainFunction, _args}) => {
        //         // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
        //         const utils = Object.fromEntries(
        //             Object.entries(_utilsFns).map(([key, value]) => [key, eval(value)]), // eslint-disable-line no-eval
        //         );
        //
        //         utils.init();
        //         return eval(_mainFunction)(utils, ..._args); // eslint-disable-line no-eval
        //     },
        //     {
        //         _utilsFns: utils.stringifyFns(utils),
        //         _mainFunction: mainFunction.toString(),
        //         _args: args || [],
        //     },
        // );
    },
});
