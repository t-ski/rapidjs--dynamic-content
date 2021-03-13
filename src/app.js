const config = {
	webDirName: "web"
};

let coreAppInstance;

server.finish("html", data => {
    return data;
});

module.exports = coreApp => {
    coreAppInstance = coreApp;
};