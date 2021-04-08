/*global config*/

// Reusable runtime runtimeData storage
let runtimeData = {};
// Load handler callbacks
let loadHandlers = {
	progress: [],
	finished: [] 
};

const CONTENT_NAME_REGEX = new RegExp(`(\\${config.dynamicPageDirPrefix}[a-z0-9_-]+)+`, "i");

// Initialize
document.addEventListener("DOMContentLoaded", _ => {
	// Retrieve wrapper element instance
	runtimeData.wrapper = document.querySelector(`*[${config.wrapperElementAttribute}]`);
	if(!runtimeData.wrapper) {
		// No further action as no wrapper element defined
		return;
	}

	runtimeData.wrapper.removeAttribute(config.wrapperElementAttribute);
    
	runtimeData.contentName = document.location.pathname.match(CONTENT_NAME_REGEX);
	runtimeData.contentName && (runtimeData.contentName = runtimeData.contentName[0].split(config.dynamicPageDirPrefix)[1]);
	!runtimeData.contentName && (runtimeData.contentName = config.defaultContentName);
	
	// Make initial load call
	load(runtimeData.contentName, true);

	history.replaceState(getStateObj(), "");
});
// Intercept backwards navigation to handle it accordingly
window.addEventListener("popstate", e => {
	if(!e.state) {
		return;
	}
    
	e.preventDefault();
	load(e.state.content);
});

function getStateObj() {
	return {
		content: runtimeData.contentName
	};
}

/**
 * Internal load method.
 * @param {String} content Content name
 * @param {Boolean} [isInitial=false] Whethter it is the initially load call
 * @returns {Promise} Resolves empty on success (error if failure)
 */
function load(content, isInitial = false) {
	if(!runtimeData.wrapper) {
		console.error("No wrapper element defined");

		return;
	}

	const baseIndex = document.location.pathname.lastIndexOf("/") + 1;
	const internalPathname = `${document.location.pathname.slice(0, baseIndex)}${config.dynamicPageDirPrefix}${document.location.pathname.slice(baseIndex).replace(CONTENT_NAME_REGEX, "")}`;
	
	return new Promise((resolve, reject) => {
		RAPID.core.post(config.requestEndpoint, {
			pathname: internalPathname,
			content: content || config.defaultContentName
		}).then(async res => {
			if(res.status != 200) {
				document.location.href = document.location.pathname.replace(/\/[^/]+$/, "/404.html");
			}
			
			// Explicitly download body to handle progress
			const contentLength = res.headers.get("Content-Length");
			let receivedLength = 0;

			const reader = res.body.getReader();
			let chunks = [];
			let curChunk;
			while((curChunk = await reader.read()) && !curChunk.done) {
				applyHandlerCallbacks(loadHandlers.progress, [receivedLength / contentLength], isInitial);

				receivedLength += curChunk.value.length;
				chunks.push(curChunk.value);
			}

			applyHandlerCallbacks(loadHandlers.progress, [1], isInitial);

			let chunksAll = new Uint8Array(receivedLength);
			let position = 0;
			for(let chunk of chunks) {
				chunksAll.set(chunk, position);
				position += chunk.length;
			}
			
			runtimeData.wrapper.innerHTML = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
			
			// Call finished handler with old and new content name
			const contentNames = {
				old: (runtimeData.contentName == content) ? null : runtimeData.contentName,
				new: content
			};
			applyHandlerCallbacks(loadHandlers.finished, [contentNames.old, contentNames.new], isInitial);

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
	function applyHandlerCallbacks(handler, args, isInitial) {
		(handler || []).forEach(handler => {
			if(isInitial && !handler.callInitially) {
				// Ignore if is initial call but disabled for initial load
				return;
			}

			handler.callback.apply(null, args);
		});
	}
}

/**
 * Load markup into the designated wrapper element
 * @param {String} content Content name
 */
module.load = function(content) {
	load(content).then(_ => {
		runtimeData.contentName = content;
		
		// Manipulate history object
		const newPathname = document.location.pathname.replace(CONTENT_NAME_REGEX, "") + ((content == config.defaultContentName) ? "" : (config.dynamicPageDirPrefix + content));
		history.pushState(getStateObj(), "", newPathname);
	}).catch(err => {
		console.error(err);
	});
};

/**
 * Add a progress handler.
 * @param {Function} callback Progress callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)
 * @param {Boolean} [callInitially=true] Whether to apply callback on initial load
 */
module.addProgressHandler = function(callback, callInitially = true) {
	loadHandlers.progress.push({
		callback: callback,
		callInitially: callInitially
	});
};

/**
 * Add a finished handler.
 * @param {Function} callback Callback getting passed an old and a new content name after successfully having loaded content
 * @param {Boolean} [callInitially=true] Whether to apply callback on initial load
 */
 module.addFinishedHandler = function(callback, callInitially = true) {
	loadHandlers.finished.push({
		callback: callback,
		callInitially: callInitially
	});
};

/**
 * Get the name of the currently loaded content.
 * @returns {String} Content name
 */
module.content = function() {
	return runtimeData.contentName;
};	// TODO: Remove?

// TODO: Call setProgressHandler() on backwards navigation?