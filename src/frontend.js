// Reusable runtime runtimeData storage
let runtimeData = {};
// Load handler callbacks
let loadHandlers = {
	progress: [],
	finalizeed: [] 
};

const CONTENT_NAME_REGEX = new RegExp(`(\\${config.dynamicPageDirPrefix}[a-z0-9_-]+)+(?:($|\\?))`, "i");

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
	runtimeData.contentName = document.location.pathname.match(CONTENT_NAME_REGEX);
	runtimeData.contentName && (runtimeData.contentName = runtimeData.contentName[0].match(new RegExp(`\\${config.dynamicPageDirPrefix}[a-z0-9_-]+`, "gi")).map(content => content.slice(config.dynamicPageDirPrefix.length)));
	!runtimeData.contentName && (runtimeData.contentName = [config.defaultContentName]);

	history.replaceState(getState(), "", document.location.href);
	load(runtimeData.contentName, true).then(_ => {
		// Scroll to anchor if stated in URL
		document.location.hash && document.querySelector(`#${document.location.hash}`).scrollIntoView();
	});
});
// Intercept backwards navigation to handle it accordingly
window.addEventListener("popstate", e => {
	if(!e.state) {
		return;	// TODO: Initiate default process
	}
	console.log(e.state);
	
	load(e.state, true);
	e.preventDefault();
});

function getState() {
	return runtimeData.contentName;
}

/**
 * Internal load method.
 * @param {String} content Content name
 * @param {Boolean} [isInitial=false] Whethter it is the initial load call
 * @param {Boolean} [isHidden=false] Whethter it is a load call to be performed without affecting history
 * @returns {Promise} Resolves empty on success (error if failure)
 */
function load(content, isInitial = false) {
	if(!runtimeData.wrapper) {
		console.error("No wrapper element defined");

		return;
	}
	
	const baseIndex = document.location.pathname.lastIndexOf("/") + 1;
	const internalPathname = `${document.location.pathname.slice(0, baseIndex)}${config.dynamicPageDirPrefix}${document.location.pathname.slice(baseIndex).replace(CONTENT_NAME_REGEX, "")}`;
	
	content = !Array.isArray(content) ? [content] : content;
	(content.length > 1 && content.slice(-1) == config.defaultContentName) && content.pop();

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
			
			// Call finalizeed handler with old and new content name
			const contentNames = {
				old: runtimeData.contentName,
				new: content
			};
			applyHandlerCallbacks(loadHandlers.finalizeed, [contentNames.old, contentNames.new], isInitial);

			runtimeData.contentName = content;
			
			// Manipulate history object
			if(!isInitial) {
				let newPathname = document.location.pathname.replace(CONTENT_NAME_REGEX, "");
				newPathname = newPathname.replace(/$|\?/, (content.length == 1 && content[0] == config.defaultContentName) ? "" : content.map(cont => `${config.dynamicPageDirPrefix}${cont}`).join(""));
				history.pushState(getState(), "", newPathname);
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
	function applyHandlerCallbacks(handler, args, isInitial) {
		(handler || []).forEach(handler => {
			if((isInitial && handler.flag == plugin.flag.EVENTUALLY)
			|| (!isInitial && handler.flag == plugin.flag.INITIALLY)) {
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
 * @param {String} content Content name
 * @returns {Promise} Promise resolving on load complete
 */
plugin.load = function(content) {
	return load(content);
};

/**
 * Enumeration representing load type flags:
 * ALWAYS: Alwys call handler when related event fires (initially and eventually)
 * INITIALLY: Only call handler on initial the load
 * EVENTUALLY: Always call handler except for on the initial load
 */
plugin.flag = {
	ALWAYS: 0,
	INITIALLY: 1,
	EVENTUALLY: 2
};

/**
 * Add a progress handler.
 * @param {Function} callback Progress callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)
 * @param {flag} [callInitially=flag.ALWAYS] Type of handler application (always by default)
 */
plugin.addProgressHandler = function(callback, flag = plugin.flag.ALWAYS) {
	loadHandlers.progress.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Add a finalizeed handler.
 * @param {Function} callback Callback getting passed an old and a new content name after successfully having loaded content
 * @param {flag} [callInitially=flag.ALWAYS] Type of handler application (always by default)
 */
plugin.addFinishedHandler = function(callback, flag = plugin.flag.ALWAYS) {
	loadHandlers.finalizeed.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Get the name of the currently loaded content.
 * @returns {String} Content name
 */
plugin.content = function() {
	return runtimeData.contentName;
};