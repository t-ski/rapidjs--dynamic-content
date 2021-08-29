/**
 * Plug-in providing dynamic content loading functionality for dynamic page environments.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	defaultContentName: "index",
	dynamicPageDirPrefix: ":",
	dynamicPageFilePrefix: "_",
	wrapperElementAttribute: "dynamic-content-wrapper"
};

const {join, dirname} = require("path");
const { sub } = require("../../../@rapidjs.org/core/src/support/web-path");

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = rapidJS => {
	// Initialize feature frontend module
	rapidJS.initFrontendModule("./frontend", config, true);
	
	// Add POST route to retrieve specific content
	rapidJS.setEndpoint((_, req) => {
		const content = (req.compound.args.length == 0) ? [config.defaultContentName] : req.compound.args;
		const contentFilePath = join(req.pathname, content.slice(0, -1).map(content => `${config.dynamicPageDirPrefix}${content}`).join("/"));
		const lastContentName = content.slice(-1);
		
		let subDirectoryPath = join(contentFilePath, `${config.dynamicPageDirPrefix}${lastContentName}`, `${config.dynamicPageFilePrefix}${config.defaultContentName}.html`);
		if(rapidJS.file.exists(subDirectoryPath)) {
			// Found directory to use (index added as is prioritized; ignoring existing content files on same level)
			return formResponse(rapidJS.file.read(subDirectoryPath));
		}

		subDirectoryPath = join(contentFilePath, `${config.dynamicPageFilePrefix}${lastContentName}.html`);
		if(rapidJS.file.exists(subDirectoryPath)) {
			// Use content file as no valid directory found
			return formResponse(rapidJS.file.read(subDirectoryPath));
		}
		
		// 404
		subDirectoryPath = join(req.pathname, `${config.dynamicPageFilePrefix}${404}.html`);
		throw new rapidJS.ClientError(404, formResponse(
			rapidJS.file.exists(subDirectoryPath)
			? rapidJS.file.read(subDirectoryPath)
			: undefined)
		);
			
		function formResponse(data) {
			return {
				content: content,
				data: String(data)
			};
		}
	});
};