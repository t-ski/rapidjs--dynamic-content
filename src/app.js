const config = {
    frontendModuleFileName: "rapid.loader.frontend.js"
};

const {readFileSync} = require("fs");
const {join} = require("path");

const FRONTEND_MODULE = readFileSync(join(__dirname, "frontend.js"));

function init(coreAppInstance) {
    // Add finisher
    coreAppInstance.finish("", data => {
        const headInsertionIndex = data.search(/<\s*\/head\s*>/);
        if(headInsertionIndex == -1) {
            return data;
        }
        data = data.slice(0, headInsertionIndex) + `<script src="/${config.frontendModuleFileName}"></script>` + data.slice(headInsertionIndex);
        return data;
    });

    coreAppInstance.route("get", `/${config.frontendModuleFileName}`, _ => {
        return FRONTEND_MODULE;
    });
}

module.exports = init;