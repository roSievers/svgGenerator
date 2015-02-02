/* The application javascript performs some basic transformations on the
 * supplied html. Hooks are placed in several places. This is determined
 * by CSS classes. In particular:
 *
 * application-input
 *   -> whenever the content is modified, the parser is rerun.
 *
 * application-output
 *   -> whenever the solution changes, the output functions are run.
 *
 * application-static-link
 *   -> When the (parsed) input is modified it will be serialized and placed here
 *   implement application.serialize and application.deserialize to use this feature.
 *
 * application-download
 *   ! only allowed on elements of type "a"
 *   ! the href points to the id of the target container.
 */

function indexById (array) {
    var result = {};
    for (var i=0; i < array.length; i++) {
        result[array[i].id] = array[i];
    }
    return result;
}

var application = {
    inputs : indexById(document.getElementsByClassName("application-input")),
    outputs : indexById(document.getElementsByClassName("application-output")),
    staticLink : document.getElementById("application-static-link"),
    renderOutput : {}
};


/* Download links */

application.startDownload = function (container) {
    var payload = application.outputs[container].innerHTML
    var blob = new Blob([payload], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "image.svg");
};

/* Transform all the download links */
var downloads = document.getElementsByClassName("application-download");
for (var i = 0; i < downloads.length; i++) {
    var urlStructure = downloads[i].href.split("/");
    var oldlink = urlStructure[urlStructure.length -1];
    downloads[i].href = "#";
    downloads[i].onclick = function () {return application.startDownload(oldlink)};
}

application.inputRefresh = function () {
    application.messages.setContext("parsing");
    application.messages.clear();

    var rawInputData = {};
    for (i in application.inputs) {
        rawInputData[i] = application.inputs[i].value;
    }

    var inputData = application.parseInput(rawInputData);

    if (typeof(inputData) == "undefined") {
        application.messages.warn("The input can't be parsed");
    }

    if (application.cache.setParsed(inputData)) {
        // There is nothing todo, as the input data did not actually change
        return false;
    }

    // Input data has changed and we need to update the resulting data accordingly.
    application.messages.setContext("processing");
    application.messages.clear();

    var processedData = application.processData(inputData);

    if (typeof(processedData) == "undefined") {
        application.messages.error("An error has occurred during processing.");
    }

    if (application.cache.setProcessed(inputData)) {
        // Rendering doesn't need to be repeated,
        // as the real data did not actually change.
        return false;
    }

    // The processed data has changed and we need to update the outputs.
    application.messages.setContext("rendering");
    application.messages.clear();

    for (o in application.outputs) {
        application.renderOutput[o](processedData);
    }

    // If no errors occurred, serialize the input data into a link.
    application.messages.setContext("serialization");
    application.messages.clear();

    var serializedData = application.serialize(inputData);
    var serializedInputLink = document.location.href.split("#")[0] + "#" + serializedData;

    if (typeof(serializedInputLink) == "undefined") {
        application.messages.error("The static link can't be created.");
    }

    application.staticLink.value = serializedInputLink;
    document.location.hash = "#"+serializedData;

    // Done.
    application.messages.setContext("unspecified");
}

application.init = function () {
    serializedData = document.location.hash;
    recreatedInput = application.deserialize(serializedData);
    if (typeof(recreatedInput) != undefined) {
        for (i in recreatedInput) {
            application.inputs[i].value = recreatedInput[i];
        }
    }
    application.inputRefresh();
}

/* Hook up all input elements */
for (i in application.inputs) {
    application.inputs[i].onkeyup = application.inputRefresh;
}


// Caching stubs.
application.cache = {
    setParsed : function (x) {return false;},
    setProcessed : function (x) {return false;}
}

// The messaging module for warnings and errors
application.messages = {
    contexts : {
        parsing : {error: "Parsing error: %1", warning: "Warning (Parsing): %1"},
        processing : {error: "Processing error: %1", warning: "Warning (Processing): %1"},
        rendering : {error: "Rendering error: %1", warning: "Warning (Rendering): %1"},
        serialization : {error: "Serialization error: %1", warning: "Warning (Serialization): %1"},
        unspecified: {error: "Error: %1", warning: "Warning: %1"}
    },
    context : undefined
};
application.messages.context = application.messages.contexts.unspecified;

application.messages.setContext = function (context) {
    application.messages.context = application.messages.contexts[context];
}

application.messages.clear = function () {
    application.messages.context.errors = [];
    application.messages.context.warnings = [];
    return true;
}

application.messages.warn = function (text) {
    application.messages.context.warnings.push(
        application.messages.context.warning.replace("%1", text)
    );
    return true;
}

application.messages.error = function (text) {
    application.messages.context.errors.push(
        application.messages.context.error.replace("%1", text)
    );
    return true;
}

// Some default parsers and processors
application.parseInput = function (x) {return x;};
application.processData = function (x) {return x;};
