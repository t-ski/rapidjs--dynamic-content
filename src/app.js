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

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = rapidJS => {
	// Initialize feature frontend module
	rapidJS.initFrontendModule("./frontend", config);
	
	// Add POST route to retrieve specific content
	rapidJS.setEndpoint((_, req) => {
		const pathname = dirname(req.pathname);	
		const content = (req.args.length == 0) ? [config.defaultContentName] : req.args;
		
		let contentFilePath = join(pathname, content.slice(0, -1).map(content => `${config.dynamicPageDirPrefix}${content}`).join("/"));
		const lastContentName = content.slice(-1);
		
		// TODO: Use exists method on reader interface once implemented
		let subDirectoryPath;
		try {
			subDirectoryPath = join(contentFilePath, `${config.dynamicPageDirPrefix}${lastContentName}`, `${config.dynamicPageFilePrefix}${config.defaultContentName}.html`);
			
			// Found directory to use (index added as is prioritized; ignoring existing content files on same level)
			return formResponse(rapidJS.readFile(subDirectoryPath));
		} catch(_) {
			try {
				subDirectoryPath = join(contentFilePath, `${config.dynamicPageFilePrefix}${lastContentName}.html`);

				// Use content file as no valid directory found
				return formResponse(rapidJS.readFile(subDirectoryPath));
			} catch(_) {
				subDirectoryPath = join(pathname, `${config.dynamicPageFilePrefix}${404}.html`);
				
				let data;
				try {
					data = rapidJS.readFile(subDirectoryPath);
				} catch(_) {
					// ...
				}
				
				throw new rapidJS.ClientError(404, formResponse(data));
			}
		}

		function formResponse(data) {
			return {
				content: content,
				data: String(data)
			};
		}
	});
};