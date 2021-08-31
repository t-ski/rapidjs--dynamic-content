"use strict";


// Reusable runtime runtimeData storage
let runtimeData = {
	// Load handler callbacks
	loadHandlers: {
		progress: [],
		finished: [] 
	}
};

// Initialize
document.addEventListener("DOMContentLoaded", _ => {
	// Retrieve wrapper element instance
	runtimeData.wrapper = document.querySelector(`*[${config.wrapperElementAttribute}]`);
	if(!runtimeData.wrapper) {
		// No further action as no wrapper element defined
		return;
	}
	runtimeData.wrapper.removeAttribute(config.wrapperElementAttribute);
	
	load(null, document.location.hash, true);
});
// Intercept backwards navigation to handle it accordingly
window.addEventListener("popstate", e => {
	if(!e.state) {
		return;
	}
	
	load(e.state, location.hash, false, true);
	e.preventDefault();
});

function getState() {
	return runtimeData.curContent;
}

/**
 * Internal load method.
 * @param {String} content Content name
 * @param {String} [anchor] Anchor to scroll to after load
 * @param {Boolean} [isInitial=false] Whethter it is the initial load call
 * @param {Boolean} [isHistoryBack=false] Whethter it is the history back load call
 * @returns {Promise} Resolves empty on success (error if failure)
 */
function load(content, anchor, isInitial = false, isHistoryBack = false) {
	// TODO: Update location pathname => loads based on location
	if(!runtimeData.wrapper) {
		console.error("No wrapper element defined");

		return;
	}

	content = Array.isArray(content) ? content : [content];

	// Manipulate history object
	if(!isInitial && !isHistoryBack) {
		let parts = document.location.pathname
		.split(/\//g)
		.filter(part => {
			return (part.length > 0 && part != config.defaultContentName);
		});
		const contentLength = runtimeData.curContent.filter(content => content != config.defaultContentName).length;
		parts = (contentLength > 0) ? parts.slice(0, -contentLength) : parts;

		const newPathname = parts.concat(content).join("/");
		history.pushState(getState(), "", `/${newPathname}${document.location.hash || ""}`);
	}

	return new Promise((resolve, reject) => {
		rapidJS.useEndpoint(null, progress => {
			applyHandlers(runtimeData.loadHandlers.progress, [progress]);
		}).then(res => {
			if(!res.data) {
				return;
			}
			
			runtimeData.wrapper.innerHTML = res.data;

			// TODO: How to wait for parsing/rendering complete? => id on last element and iterative check for existence?
			
			// Scroll to anchor if given
			if(anchor) {
				const anchorElement = document.querySelector(`#${anchor.replace(/^#/, "")}`);

				let i = 0;
				const anchorScrollInterval = setInterval(_ => {
					anchorElement.scrollIntoView();
					i++;
					if(i >= 10) {
						clearInterval(anchorScrollInterval);
					}
				}, 50);
			}
			
			applyHandlers(runtimeData.loadHandlers.finished, [runtimeData.curContent, res.content]);
			runtimeData.curContent = res.content;
			
			resolve();
		}).catch(err => {
			reject(err);
		}).finally(_ => {
			if(!isInitial) {
				return;
			}
			
			history.replaceState(getState(), "", `${document.location.pathname}${document.location.hash || ""}`);
		});
	});

	function applyHandlers(handlers, args) {
		handlers.forEach(handler => {
			if(!isHistoryBack && (isInitial && handler.flag == PUBLIC.flag.EVENTUALLY)
			|| (!isInitial && runtimeData.loadHandlers.finished.flag == PUBLIC.flag.INITIALLY)) {
				// Ignore if flags compete with load event state
				return;
			}

			handler.callback.apply(null, args);
		});
	}
}

/**
 * Load markup into the designated wrapper element
 * @param {String} content Name of content to load
 * @param {String} [anchor] Anchor to scroll to after load
 * @returns {Promise} Promise resolving on load complete, rejecting on error
 */
PUBLIC.load = function(content, anchor) {
	return load(content, anchor);
};

/**
 * Enumeration representing load type flags:
 * ALWAYS: Always call handler when related event fires (initially and eventually)
 * INITIALLY: Only call handler on initial the load
 * EVENTUALLY: Always call handler except for on the initial load
 */
PUBLIC.flag = {
	ALWAYS: 0,
	INITIALLY: 1,
	EVENTUALLY: 2
};

/**
 * Add a progress handler.
 * @param {Function} callback Progress callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)
 * @param {flag} [flag=flag.ALWAYS] Type of handler application (always by default)
 */
PUBLIC.addProgressHandler = function(callback, flag = PUBLIC.flag.ALWAYS) {
	runtimeData.loadHandlers.progress.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Add a finished handler.
 * @param {Function} callback Callback being executed after successfully having loaded content, getting passed the old and new content array each
 * @param {flag} [flag=flag.ALWAYS] Type of handler application (always by default)
 */
PUBLIC.addFinishedHandler = function(callback, flag = PUBLIC.flag.ALWAYS) {
	runtimeData.loadHandlers.finished.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Get the name of the currently loaded content.
 * @returns {String} Content name
 */
PUBLIC.content = function() {
	return runtimeData.contentName;
};