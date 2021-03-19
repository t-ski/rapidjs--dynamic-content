const config = {
    frontendModuleFileName: "rapid.loader.frontend.js"
};

const {readFileSync} = require("fs");
const {join} = require("path");

let frontendModuleData = String(readFileSync(join(__dirname, "frontend.js")));
(frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
    let value = config[configAttr.match(/[a-zA-Z0-9_]+$/)[0]] || "null";
    isNaN(value) && (value = `"${value}"`);

    frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
});

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
    
    coreAppInstance.route("get", `/${config.frontendModuleFileName}`, res => {
        res.setHeader("Content-Type", "text/javascript");

        return frontendModuleData;
    });
}

module.exports = init;