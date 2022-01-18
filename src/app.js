/**
 * Plug-in providing dynamic content loading functionality for dynamic page environments.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	defaultContentName: "index",
	dynamicPageFilePrefix: "_",
	wrapperElementAttribute: "dynamic-content-wrapper"
};

const {join} = require("path");

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = rapidJS => {
	// Initialize feature client module
	$this.clientModule("./client", config, true);

	// Add endpoint for content retrieval
	$this.endpoint((_, req) => {
		const content = (req.compound.args.length == 0) ? [config.defaultContentName] : req.compound.args;
		const contentFilePath = join(req.pathname, content.slice(0, -1).map(content => `${config.dynamicPageFilePrefix}${content}`).join("/"));
		const lastContentName = content.slice(-1);
		
		let subDirectoryPath = join(contentFilePath, `${config.dynamicPageFilePrefix}${lastContentName}`, `${config.dynamicPageFilePrefix}${config.defaultContentName}.html`);
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
				: null)
		);
		
		function formResponse(data) {
			return {
				content: content,
				data: data ? String(data) : data
			};
		}
	});
};