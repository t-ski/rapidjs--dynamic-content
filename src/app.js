/**
 * Plug-in providing dynamic content loading functionality for dynamic page environments.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	defaultContentName: "index",
	notFoundContentName: "404",
	dynamicPageFilePrefix: "_",
	dynamicPageFileExtension: ".html"
};

const {join} = require("path");

// TODO: Implement markup iterator over all content file idnetifiers (e.g. for displaying buttons)

module.exports = rapidJS => {
	// Initialize feature client module
	$this.clientModule("./client", {
		defaultContentName: config.defaultContentName
	}, true);

	$this.namedEndpoint("initial", (_, req) => {
		return {
			base: req.compound.base,
			content: req.compound.args
		}
	});

	// Add endpoint for content retrieval
	$this.endpoint((content, req) => {
		// Append requested content by default content name if not yet given (nested priority)
		([config.defaultContentName, ""].includes((content || [""]).slice(-1)))
		&& (content.pop());
		content.push(config.defaultContentName);

		// Look for according content file:
		let data;

		// 1. Nested
		if(content.length >= 2) {
			data = retrieveContent(content);
			if(data) {
				return data;
			}

			content = content.slice(0, -1);
		}

		// 2. Direct
		data = retrieveContent(content);
		if(data) {
			return data;
		}
		
		// 3. 404
		data = retrieveContent([config.notFoundContentName]);
		throw new rapidJS.ClientError(404, data);
		
		/**
		 * Retrieve content file data.
		 * @param {String[]} contentSequence Content path sequence
		 * @returns {String} Content data or undefined if not found
		 */
		function retrieveContent(contentSequence) {
			// Dynamic page file prefix (last index, length based on arg)
			const normalizeContentSequence = [].concat(contentSequence);
			for(let i = Math.min(2, normalizeContentSequence.length) - 1; i >= 0; i--) {
				normalizeContentSequence[i] = `${config.dynamicPageFilePrefix}${normalizeContentSequence[i]}`;
			}

			// Dynamic page file extension (last index)
			normalizeContentSequence.push(normalizeContentSequence.pop() + config.dynamicPageFileExtension);

			// Respective dynamic page file path
			const contentFilePath = join(req.pathname, normalizeContentSequence.join("/"));

			if(rapidJS.file.exists(contentFilePath)) {
				return rapidJS.file.read(contentFilePath);
			}

			return undefined;
		}
	});
};