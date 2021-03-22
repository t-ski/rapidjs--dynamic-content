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

    /**
     * Load markup into the designated wrapper element.
     * @param {String} content Content name
     */
    function load(content) {
        if(!runtimeData.wrapper) {
            return;
        }

        const baseIndex = document.location.pathname.lastIndexOf("/") + 1;
        const internalPathname = `${document.location.pathname.slice(0, baseIndex)}${config.dynamicPageDirPrefix}${document.location.pathname.slice(baseIndex).replace(CONTENT_NAME_REGEX, ``)}`;
        post(config.requestEndpoint, {
            pathname: internalPathname,
            content: content
        }).then(data => {
            if(data.status != 200) {
                throw 404;
            }
            
            return data.json();
        }).then(data => {
            runtimeData.wrapper.innerHTML = String(data);

            // Dispatch content loaded event
            const event = new Event(config.loadEventName);
            document.dispatchEvent(event);
        }).catch(err => {
            document.location.href = document.location.pathname.replace(/\/[^\/]+$/, "/404.html");
        });
    };

    // INTERFACE

    module.load = function(content) {
        load(content);
        
        const newPathname = document.location.href.replace(CONTENT_NAME_REGEX, `${config.dynamicPageDirPrefix}${content}`);
        history.pushState({

        }, "", newPathname); // TODO: (How to) send body along?
    };

    return module;
    
})(RAPID || {});