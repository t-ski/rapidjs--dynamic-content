const RAPID = (module => {

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

    HTMLElement.prototype.load = function(id) {
        let data = post();
        console.log(data);
    };

    return module;

})(RAPID || {});