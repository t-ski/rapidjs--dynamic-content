var RAPID = (module => {

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
     * Load markup into a given host element.
     * @param {HTMLElement} element Host element
     * @param {String} content Content name
     */
    module.load = function(element, content) {
        post(config.requestEndpoint, {
            pathname: document.location.pathname,
            content: content
        }).then(data => data.json()).then(data => {
            element.innerHTML = data
        });
    };

    return module;

})(RAPID || {});