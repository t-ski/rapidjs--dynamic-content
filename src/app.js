/**
 * @copyright Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

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

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = coreAppInstance => {
	coreAppInstance.initFeatureFrontend(__dirname, config);
    
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
};