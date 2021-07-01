/**
 * Plug-in providing dynamic content loading functionality for dynamic page environments.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	defaultContentName: "index",
	dynamicPageDirPrefix: ":",
	dynamicPageFilePrefix: "_",
	requestEndpoint: "/_dynamic-content",
	wrapperElementAttribute: "dynamic-content-wrapper"
};

const {existsSync} = require("fs");
const {join} = require("path");

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = coreInterface => {
	// Initialize feature frontend module
	coreInterface.initFrontendModule(config, true);
	
	// Add POST route to retrieve specific content
	coreInterface.setRoute("post", config.requestEndpoint, body => {
		if(!body.content || (Array.isArray(body.content) && body.content.length == 0)) {
			body.content = config.defaultContentName;
		}
		if(/^\/$/.test(body.pathname)) {
			body.pathname += config.defaultContentName;
		}
		
		// Tranlsate pathname to internal compound page representation
		body.pathname = body.pathname.replace(/([^/]+)$/, ":$1");

		// Wrap single content names passed as string in an array for uniformal handling
		body.content = !Array.isArray(body.content) ? [body.content] : body.content;
		
		const compoundBasePath = join(coreInterface.webPath, body.pathname);

		let contentFilePath = join(compoundBasePath, body.content.slice(0, -1).map(content => `${config.dynamicPageDirPrefix}${content}`).join("/"));
		const lastContentName = body.content.slice(-1);
		
		const subDirectoryPath = join(contentFilePath, `${config.dynamicPageDirPrefix}${lastContentName}`, `${config.dynamicPageFilePrefix}${config.defaultContentName}.html`);
		if(existsSync(subDirectoryPath)) {
			// Found directory to use (index added as is prioritized; ignoring existing content files on same level)
			contentFilePath = subDirectoryPath;
		} else {
			// Use content file as no valid directory found
			contentFilePath = join(contentFilePath, `${config.dynamicPageFilePrefix}${lastContentName}.html`);
		}
		
		if(!existsSync(contentFilePath)) {
			const errorContentFilePath = join(compoundBasePath, `${config.dynamicPageFilePrefix}${404}.html`);
			if(!existsSync(errorContentFilePath)) {
				throw 404;
			}

			return String(coreInterface.applyReader("html", errorContentFilePath));
		}
		
		return String(coreInterface.applyReader("html", contentFilePath));
	});
};