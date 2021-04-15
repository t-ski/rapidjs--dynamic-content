/**
 * @description Feature providing dynamic content loading functionality for dynamic page environments.
 * @copyright/@author Thassilo Martin Schiepanski
 */

const config = {
	defaultContentName: "index",
	dynamicPageContentPrefix: ":",
	loadEventName: "rapid--ContentLoaded",
	requestEndpoint: "_loader",
	wrapperElementAttribute: "rapid--wrapper"
};

const {readFileSync, existsSync} = require("fs");
const {join} = require("path");

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = coreAppInstance => {
	// Integrate dependencies
	require("../../rapid-dynamic-pages/src/app")(coreAppInstance);

	// Initialize feature frontend module
	coreAppInstance.initFeatureFrontend(__dirname, config);
	
	// Add POST route to retrieve specific content
	coreAppInstance.route("post", `/${config.requestEndpoint}`, body => {
		if(!body.content) {
			body.content = config.defaultContentName;
		}

		// Wrap single content names passed as string in an array for uniformal handling
		body.content = !Array.isArray(body.content) ? [body.content] : body.content;

		let contentFilePath = join(coreAppInstance.webPath(),
			body.pathname, body.content.slice(0, -1).map(content => `${config.dynamicPageContentPrefix}${content}`).join("/"),
			`${config.dynamicPageContentPrefix}${body.content.slice(-1)}`);
		
		if(existsSync(contentFilePath)) {
			// Found directory to use (index added as is prioritized; ignoring existing content files on same level)
			contentFilePath = join(contentFilePath, `${config.dynamicPageContentPrefix}${config.defaultContentName}.html`);
		} else {
			// Use content file as no valid directory found
			contentFilePath = `${contentFilePath}.html`;
		}
		console.log(contentFilePath);
		if(!existsSync(contentFilePath)) {
			throw 404;
		}
		
		return String(readFileSync(contentFilePath));
	});
};