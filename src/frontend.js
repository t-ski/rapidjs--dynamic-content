// Reusable runtime runtimeData storage
let runtimeData = {};
// Load handler callbacks
let loadHandlers = {
	progress: [],
	finished: [] 
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
	
	// Make initial load call
	runtimeData.contentName = rapidJS.core.compoundPage.args || [config.defaultContentName];

	history.replaceState(getState(), "", document.location.href);
	load(runtimeData.contentName, document.location.hash, true);
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
	return runtimeData.contentName;
}

/**
 * Internal load method.
 * @param {String} content Content name
 * @param {String} [anchor] Anchor to scroll to after load
 * @param {Boolean} [isInitial=false] Whethter it is the initial load call
 * @param {Boolean} [isHistoryBack=false] Whethter it is the history back load call
 * @returns {Promise} Resolves empty on success (error if failure)
 */
function load(content, anchor = null, isInitial = false, isHistoryBack = false) {
	if(!runtimeData.wrapper) {
		console.error("No wrapper element defined");

		return;
	}
	
	content = !Array.isArray(content) ? [content] : content;
	(content.length > 1 && content.slice(-1) == config.defaultContentName) && content.pop();
	
	return new Promise((resolve, reject) => {
		runtimeData.contentName = content;
		
		rapidJS.core.useEndpoint({
			pathname: rapidJS.core.compoundPage.base,
			content: content || config.defaultContentName
		}).then(async res => {
			// Manipulate history object
			if(!isInitial && !isHistoryBack) {
				let newPathname = `${rapidJS.core.compoundPage.base}/${(content.length == 1 && content[0] == config.defaultContentName) ? "" : content.join("/")}`;

				history.pushState(getState(), "", newPathname);
			}

			if(res.status != 200) {
				window.location.replace(rapidJS.core.compoundPage.base);	// TODO: Enhance
				
				return;
			}
			
			// Explicitly download body to handle progress
			const contentLength = res.headers.get("Content-Length");
			let receivedLength = 0;

			const reader = res.body.getReader();
			let chunks = [];
			let curChunk;
			while((curChunk = await reader.read()) && !curChunk.done) {
				applyHandlerCallbacks(loadHandlers.progress, [receivedLength / contentLength], isInitial, isHistoryBack);

				receivedLength += curChunk.value.length;
				chunks.push(curChunk.value);
			}
			applyHandlerCallbacks(loadHandlers.progress, [1], isInitial, isHistoryBack);

			let chunksAll = new Uint8Array(receivedLength);
			let position = 0;
			for(let chunk of chunks) {
				chunksAll.set(chunk, position);
				position += chunk.length;
			}
			
			runtimeData.wrapper.innerHTML = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
						
			// TODO: How to wait for parsing/rendering complete? => id on last element and iterative check for existence?
			
			// Call finished handler with old and new content name
			const contentNames = {
				old: runtimeData.contentName,
				new: content
			};
			applyHandlerCallbacks(loadHandlers.finished, [contentNames.old, contentNames.new], isInitial, isHistoryBack);
			
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
			
			resolve();
		}).catch(err => {
			reject(err);
		});
	});

	/**
	 * Apply all set up handlers of a certain type.
	 * @helper
	 * @param {Array} handler Handler array reference 
	 * @param {Array} args Array of arguments to pass to callback
	 */
	function applyHandlerCallbacks(handler, args, isInitial, isHistoryBack) {
		(handler || []).forEach(handler => {
			if(!isHistoryBack && (isInitial && handler.flag == PUBLIC.flag.EVENTUALLY)
			|| (!isInitial && handler.flag == PUBLIC.flag.INITIALLY)) {
				// Ignore if flags compete with load event state
				return;
			}
			
			try {
				handler.callback.apply(null, args);
			} catch(err) {
				console.error("Error applying a load handler:");
				console.error(err);
			}
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
	loadHandlers.progress.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Add a finished handler.
 * @param {Function} callback Callback getting passed an old and a new content name after successfully having loaded content
 * @param {flag} [flag=flag.ALWAYS] Type of handler application (always by default)
 */
PUBLIC.addFinishedHandler = function(callback, flag = PUBLIC.flag.ALWAYS) {
	loadHandlers.finished.push({
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