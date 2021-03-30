const config = {
	defaultContentName: "index",
	dynamicPageDirPrefix: ":",
	loadEventName: "rapid--ContentLoaded",
	moduleName: "loader",
	requestEndpoint: "_loader",
	wrapperElementAttribute: "rapid--wrapper"
};

const {readFileSync, existsSync} = require("fs");
const {join} = require("path");

function init(coreAppInstance) {
	coreAppInstance.initFeatureFrontend(__dirname, config.moduleName, config);
    
	// Add POST route to retrieve specific content
	coreAppInstance.route("post", `/${config.requestEndpoint}`, body => {
		if(!body.content) {
			body.content = config.defaultContentName;
		}

		const contentFilePath = join(coreAppInstance.webPath(), body.pathname, `:${body.content}.html`);
		if(!existsSync(contentFilePath)) {
			throw 404;
		}

		return String(readFileSync(contentFilePath));
	});
}

module.exports = init;