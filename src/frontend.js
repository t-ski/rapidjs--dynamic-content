// ESLint directives
/*global config*/

"use strict";

var RAPID = (module => {

	// Reusable runtime runtimeData storage
	let runtimeData = {};

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

		load(runtimeData.contentName);

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

	function post(url, body) {
		return fetch(url, {
			method: "POST",
			mode: "same-origin",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json"
			},
			redirect: "follow",
			referrerPolicy: "no-referrer",
			body: JSON.stringify(body)
		});
	}

    function getStateObj() {
        return {
            content: runtimeData.contentName
        };
    }

	/**
     * Load markup into the designated wrapper element.
     * @param {String} content Content name
     * @param {Function} [progressCallback] Callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)
     */
	function load(content, progressCallback) {
		if(!runtimeData.wrapper) {
			return;
		}

		const baseIndex = document.location.pathname.lastIndexOf("/") + 1;
		const internalPathname = `${document.location.pathname.slice(0, baseIndex)}${config.dynamicPageDirPrefix}${document.location.pathname.slice(baseIndex).replace(CONTENT_NAME_REGEX, "")}`;
		post(config.requestEndpoint, {
			pathname: internalPathname,
			content: content || config.defaultContentName
		}).then(async res => {
			if(res.status != 200) {
				document.location.href = document.location.pathname.replace(/\/[^/]+$/, "/404.html");
			}
            
            // Explicitly download body to handle progress
            const contentLength = res.headers.get("Content-Length");;
            let receivedLength = 0;

            const reader = res.body.getReader();
            let chunks = [];
            let curChunk;
            while((curChunk = await reader.read()) && !curChunk.done) {
                callProgressCallback(receivedLength / contentLength);

                receivedLength += curChunk.value.length;
                chunks.push(curChunk.value);
            }
            callProgressCallback(1);

            let chunksAll = new Uint8Array(receivedLength);
            let position = 0;
            for(let chunk of chunks) {
                chunksAll.set(chunk, position);
                position += chunk.length;
            }
            
			runtimeData.wrapper.innerHTML = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));

			// Dispatch content loaded event
			const event = new Event(config.loadEventName);
			document.dispatchEvent(event);
		});

        function callProgressCallback(progress) {
            progressCallback && progressCallback(progress);
        }
	}

	// INTERFACE

	module.load = function(content, progressCallback) {
		load(content, progressCallback);  // TODO: (How to) send body along?
        
        runtimeData.contentName = content;

        // Manipulate history object
		const newPathname = document.location.pathname.replace(CONTENT_NAME_REGEX, "") + ((content == config.defaultContentName) ? "" : (config.dynamicPageDirPrefix + content));
		history.pushState(getStateObj(), "", newPathname);
	};

	/**
     * Get the name of the currently loaded content.
     * @returns {String} Content name
     */
	module.contentName = function() {
		return runtimeData.contentName;
	};

	return module;
    
})(RAPID || {});