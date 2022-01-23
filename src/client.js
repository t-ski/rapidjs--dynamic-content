const config = {
	wrapperElementAttribute: "dynamic-content-wrapper"
};


// Initialize
document.addEventListener("DOMContentLoaded", _ => {
	runtime.wrapper = document.querySelector(`*[${config.wrapperElementAttribute}]`);

	if(!runtime.wrapper) {
		// No wrapper element defined
		throw new ReferenceError(`No dynamic content wrapper defined (to be attributed '${config.wrapperElementAttribute}')`);
	}
	
	runtime.placeholder = runtime.wrapper.children;

	// Hide attribute as has been consumed (no further need)
	runtime.wrapper.removeAttribute(config.wrapperElementAttribute);

	// Initially request page information
	$this.namedEndpoint("initial")
	.then(res => {
		runtime.base =  res.base;

		// Initial load
		load(res.content, (document.location.hash.length > 0) ? document.location.hash : false, true);
	});
});

// Intercept backwards navigation
window.addEventListener("popstate", e => {
	if(!e.state) {
		return;
	}
	
	load(e.state, false, false, true);
});


/**
 * Runtime variables storage object.
 */
const runtime = {
	// Current content
	content: null,
	// Base URL / page path
	base: null,
	// Wrapper element reference (to be retrieved once DOM content has loaded)
	wrapper: null,
	// Placeholder elements (initial wrapper children) (for manual unloads)
	placeholder: null,
	// Load handler callbacks
	eventListeners: {
		complete: [],	// Fires upon content loading process completion
		progress: [],	// Fires upon registered content loading process progress
	}
};


/**
 * Enumeration representing application flags (depending on content loading events):
 * ALWAYS: Always invoke handler (initially and eventually)
 * INITIALLY: Only call handler on the initial, implicitly performed load event
 * EVENTUALLY: Only call handler on future, manually induced load events
 */
 const flag = {
	ALWAYS: 0,
	INITIALLY: 1,
	EVENTUALLY: 2
}


/**
 * Dispatch a content loading event.
 */
function dispatchLoadEvent(event, isInitial = false, ...args) {
	(runtime.eventListeners[event] || [])
	.filter(listener => {
		if((listener.flag == flag.ALWAYS)
		|| (isInitial == (listener.flag == flag.INITIALLY))) {
			return true;
		}

		return false;
	})
	.forEach(listener => {
		listener.callback.apply(null, args);
	});
}

/**
 * Internal load method.
 * @param {String|String[]} content Content name(s). Give as string if is single name or as string array if is nested.
 * @param {String} [anchor] Anchor to scroll to after load (top by default, pass false to disable)
 * @param {Boolean} [isInitial=false] Whethter it is the initial load call
 * @param {Boolean} [isHistoryBack=false] Whethter it is the history back load call
 * @returns {Promise} Resolves empty on success (error if failure)
 */
function load(content, anchor, isInitial = false, isHistoryBack = false) {
	// Normalize content arguemnt to array representation
	content = Array.isArray(content) ? content : [content];
	
	let data, isSuccessful;

	return new Promise((resolve, reject) => {
		$this.endpoint(content, progress => {
			// Continuously dipatch progress event upon each registered step
			dispatchLoadEvent("progress", isInitial, progress);
		})
		.then(res => {
			// Success => Expected content data
			data = res;
			isSuccessful = true;
		})
		.catch(res => {
			if(res instanceof Error) {
				reject(res);

				return;
			}

			// Failure => Failure content data
			data = res;
			isSuccessful = false;
		})
		.finally(_ => {
			// Insert content into designated wrapper
			runtime.wrapper.innerHTML = data || "";

			// Scroll behavior
			if(anchor !== false && !anchor) {
				// Scroll to top (default behavior)
				window.scrollTo(0, 0);
			} else {
				// Scroll to provided anchor
				const anchorElement = document.querySelector(`#${anchor.replace(/^#/, "")}`);
				anchorElement && anchorElement.scrollIntoView();
			}
			
			// Manipulate history object if is irregularly motivated loading
			!isHistoryBack
			&& history[`${isInitial ? "replace" : "push"}State`](content, "", `${runtime.base}${("/" + content.join("/")).replace(new RegExp(`/(${$this.SHARED.defaultContentName})?$`, "i"), "")}${document.location.search || ""}`);

			// Fulfill promise according to content existence
			if(isSuccessful === undefined) {
				return;
			}
			isSuccessful ? resolve() : reject();

			dispatchLoadEvent("complete", isInitial, content);
		});
	});
}


/**
 * Load markup into the designated wrapper element
 * @param {String} content Name of content to load
 * @param {String|Boolean} [anchor] Anchor to scroll to after load (top by default, pass false to disable)
 * @returns {Promise} Promise resolving on load complete, rejecting on error
 */
$this.PUBLIC.load = function(content, anchor) {
	/* if(	// $this.SHARED.noLocalReload
	&& content == runtime.curContent) {
		return;
	} */

	return load(content, anchor);
};

$this.PUBLIC.flag = flag;

/**
 * Add a content loading event handler.
 * @param {string} type Handler type {"complete", "progress"}
 * @param {Function} callback Handler callback
 * @param {flag} [flag=flag.ALWAYS] When to apply the handler (always by default, see flags)
 */
$this.PUBLIC.addLoadListener = (event, callback, flag = $this.PUBLIC.flag.ALWAYS) => {
	event = event.toLowerCase();

	if(!runtime.eventListeners[event]) {
		// Invalid load event
		throw new SyntaxError(`Invalid load event '${event}'`);
	}

	runtime.eventListeners[event].push({
		callback,
		flag
	});
};

// Backwards compatible explicit handler binding functions
// TODO: Deprecate mid-term
$this.PUBLIC.addProgressHandler = (callback, flag = $this.PUBLIC.flag.ALWAYS) => {
	$this.PUBLIC.addLoadListener("progress", callback, flag);
};
$this.PUBLIC.addFinishedHandler = (callback, flag = $this.PUBLIC.flag.ALWAYS) => {
	$this.PUBLIC.addLoadListener("complete", callback, flag);
};

/**
 * Clear the content wrapper (re-deploy placeholder).
 */
$this.PUBLIC.clear = () => {
	runtime.wrapper.innerHTML = "";

	runtime.placeholder.forEach(child => {
		runtime.wrapper.appendChild(child);
	});
};

/**
 * Get the name of the currently loaded content.
 * @returns {String} Content name
 */
$this.PUBLIC.content = function() {
	return runtime.curContent;
};