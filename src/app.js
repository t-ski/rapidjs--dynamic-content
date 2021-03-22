const config = {
    defaultContentName: "index",
    dynamicPageDirPrefix: ":",
    frontendModuleFileName: "rapid.loader.frontend.js",
    loadEventName: "rapid--ContentLoaded",
    requestEndpoint: "_load",
    wrapperElementAttribute: "rapid--wrapper"
};

const {readFileSync, existsSync} = require("fs");
const {join} = require("path");

// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
let frontendModuleData = String(readFileSync(join(__dirname, "frontend.js")));
(frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
    let value = config[configAttr.match(/[a-zA-Z0-9_]+$/)[0]];
    (value !== undefined && value !== null && isNaN(value)) && (value = `"${value}"`);
    
    frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
});

function init(coreAppInstance) {
    // Add finisher
    coreAppInstance.finish("", data => {
        // No further action if no wrapper element attribute found in data string
        // (ignoring non-attribute use; double checked in frontend)
        if(!data.includes(config.wrapperElementAttribute)) {
            return data;
        }

        // Insert frontend module loading script tag
        const headInsertionIndex = data.search(/<\s*\/head\s*>/);
        if(headInsertionIndex == -1) {
            return data;
        }
        data = data.slice(0, headInsertionIndex) + `<script src="/${config.frontendModuleFileName}"></script>` + data.slice(headInsertionIndex);
        return data;
    });
    
    // Add GET route to retrieve frontend module script
    coreAppInstance.route("get", `/${config.frontendModuleFileName}`, res => {
        res.setHeader("Content-Type", "text/javascript");

        return frontendModuleData;
    });

    // Add POST route to retrieve specific content
    coreAppInstance.route("post", `/${config.requestEndpoint}`, body => {
        if(!body.content) {
            body.content = config.defaultContentName;
        }

        const contentFilePath = join(coreAppInstance.getWebPath(), body.pathname, `:${body.content}.html`);
        if(!existsSync(contentFilePath)) {
            throw 404;
        }

        return String(readFileSync(contentFilePath));
    });
}

module.exports = init;