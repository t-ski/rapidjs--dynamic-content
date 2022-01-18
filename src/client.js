// Reusable runtime runtimeData storage
let runtimeData = {
	// Load handler callbacks
	loadHandlers: {
		progress: [],
		finished: [] 
	}
};

const shared = $this.SHARED;

// TODO: Cache content option (no repeated loading)

// Initialize
document.addEventListener("DOMContentLoaded", _ => {
	// Retrieve wrapper element instance
	runtimeData.wrapper = document.querySelector(`*[${shared.wrapperElementAttribute}]`);
	if(!runtimeData.wrapper) {
		// No further action as no wrapper element defined
		return;
	}
	runtimeData.wrapper.removeAttribute(shared.wrapperElementAttribute);
	
	load(null, (document.location.hash.length > 0) ? document.location.hash : false, true);
});
// Intercept backwards navigation to handle it accordingly
window.addEventListener("popstate", e => {
	if(!e.state) {
		return;
	}
	
	e.preventDefault();
	
	load(e.state, null, false, true);
});

function getState() {
	return runtimeData.curContent;
}

// TODO:
/* 
			
scrollTopInterval = setInterval(_ => {
	window.scrollTo(0, 0);
}, 50); */

/**
 * Internal load method.
 * @param {String} content Content name
 * @param {String} [anchor] Anchor to scroll to after load (top by default, pass false to disable)
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

	const curUrl = document.location.href;
	
	// Manipulate history object
	if(!isInitial && !isHistoryBack) {
		let parts = document.location.pathname
			.split(/\//g)
			.filter(part => {
				return (part.length > 0 && part != $this.SHARED.defaultContentName);
			});
		const contentLength = runtimeData.curContent.filter(content => content != $this.SHARED.defaultContentName).length;
		parts = (contentLength > 0) ? parts.slice(0, -contentLength) : parts;
		
		const newPathname = parts.concat(content.filter(c => {
			return c != $this.SHARED.defaultContentName;
		})).join("/");
		history.pushState(getState(), "", `/${newPathname}${document.location.search || ""}`);
	}
	
	return new Promise((resolve, reject) => {
		let successful;
		let data;

		$this.endpoint(null, progress => {
			applyHandlers(runtimeData.loadHandlers.progress, [progress]);
		}).then(res => {
			successful = true;
			data = res;
		}).catch(res => {
			if(res instanceof Error) {
				reject(res);

				return;
			}
			
			successful = false;
			data = res;
		}).finally(_ => {
			if(!((data || {}).data)) {
				(successful === false)
					? console.log(404)//(document.location.href = "/")	// TODO: 404
					: history.replaceState(getState(), "", curUrl);

				return;
			}
			
			runtimeData.wrapper.innerHTML = data.data;

			// TODO: How to wait for parsing/rendering complete? => id on last element and iterative check for existence?
			
			// Scroll behavior
			const tolerantScroll = callback => {
				document.body.style.overflow = "hidden";	// TODO: Only if not already set?

				let i = 0;
				const anchorScrollInterval = setInterval(_ => {
					callback();

					i++;
					if(i >= 15) {
						clearInterval(anchorScrollInterval);

						document.body.style.removeProperty("overflow");
					}
				}, 5);
			};

			switch(anchor) {
			case false:
				// Disabled
				break;
			case undefined:
				// Top
				tolerantScroll(_ => {
					window.scrollTo(0, 0);
				});

				break;
			default: {
				// Anchor hash
				const anchorElement = document.querySelector(`#${anchor.replace(/^#/, "")}`);
				tolerantScroll(_ => {
					anchorElement.scrollIntoView();
				});

				break;
			}
			}

			applyHandlers(runtimeData.loadHandlers.finished, data.content);
			runtimeData.curContent = data.content;

			if(isInitial) {
				history.replaceState(getState(), "", `${document.location.pathname}${document.location.search || ""}`);
			}

			successful ? resolve() : reject();
		});
	});

	function applyHandlers(handlers, args) {
		handlers.forEach(handler => {
			if(!isHistoryBack && (isInitial && handler.flag == $this.PUBLIC.flag.EVENTUALLY)
			|| (!isInitial && runtimeData.loadHandlers.finished.flag == $this.PUBLIC.flag.INITIALLY)) {
				// Ignore if flags compete with load event state
				return;
			}

			handler.callback.call(null, args);
		});
	}
}

/**
 * Load markup into the designated wrapper element
 * @param {String} content Name of content to load
 * @param {String|Boolean} [anchor] Anchor to scroll to after load (top by default, pass false to disable)
 * @returns {Promise} Promise resolving on load complete, rejecting on error
 */
$this.PUBLIC.load = function(content, anchor) {
	/* if(	// $this.SHARED.noLocalReload
	&& content == runtimeData.curContent) {
		return;
	} */

	return load(content, anchor);
};

/**
 * Enumeration representing load type flags:
 * ALWAYS: Always call handler when related event fires (initially and eventually)
 * INITIALLY: Only call handler on initial the load
 * EVENTUALLY: Always call handler except for on the initial load
 */
$this.PUBLIC.flag = {
	ALWAYS: 0,
	INITIALLY: 1,
	EVENTUALLY: 2
};

/**
 * Add a progress handler.
 * @param {Function} callback Progress callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)
 * @param {flag} [flag=flag.ALWAYS] Type of handler application (always by default)
 */
$this.PUBLIC.addProgressHandler = function(callback, flag = $this.PUBLIC.flag.ALWAYS) {
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
$this.PUBLIC.addFinishedHandler = function(callback, flag = $this.PUBLIC.flag.ALWAYS) {
	runtimeData.loadHandlers.finished.push({
		callback: callback,
		flag: flag
	});
};

/**
 * Get the name of the currently loaded content.
 * @returns {String} Content name
 */
$this.PUBLIC.content = function() {
	return runtimeData.curContent;
};