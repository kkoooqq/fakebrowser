const utils = require('./index');

module.exports = (plugin, jsContent) => ({
    evaluate: async function (mainFunction, ...args) {
        const thisJsContent = `
(function() {
    const mainFunction = ${mainFunction.toString()};
    mainFunction(utils, ${args ? args.map(e => JSON.stringify(e)).join(', ') : 'undefined'});            
})(); 
`;

        const result = `${thisJsContent} \n ${jsContent}`;
        return result;
    },
});
