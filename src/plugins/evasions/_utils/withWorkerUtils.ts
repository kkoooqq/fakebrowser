// import { utils } from './'

export const withWorkerUtils = (plugin: any, jsContent: any) => ({
    evaluate: async function (mainFunction: Function, ...args: any[]) {
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

export default withWorkerUtils;
