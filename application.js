/* The application javascript performs some basic transformations on the
 * supplied html. Hooks are placed in several places. This is determined
 * by CSS classes or an id. In particular:
 *
 * CSS class "application-input"
 *   -> whenever the content is modified, the parser is rerun.
 *
 * <div class="application-output">
 *   -> whenever the solution changes, the output functions are run.
 *
 * <input type="text" id="application-static-link">
 *   -> When the (parsed) input is modified it will be serialized and placed here
 *   implement application.serialize and application.deserialize to use this feature.
 *
 * <a class="application-download" href="someTargetContainer">
 *   ! only allowed on elements of type "a"
 *   ! the href points to the id of the target container.
 *
 * <div id="stderr">
 *   -> all errors and warnings will output in this div
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
    stderr : document.getElementById("stderr"),
    renderOutput : {},
    parse : {}, // keeps all the parsers around.
    cache : {
        parsedData : {},
        serializedData : undefined,
        setParsed : function (x) {return false;},
        setProcessed : function (x) {return false;}
    }
};


/* Download links */

application.startDownload = function (container) {
    var payload = application.outputs[container].innerHTML
    var blob = new Blob([payload], {type: "text/plain;charset=utf-8"});
    var filename = container + ".svg";
    saveAs(blob, filename);
};

/* Transform all the download links */
var downloads = document.getElementsByClassName("application-download");
for (var i = 0; i < downloads.length; i++) {
    var urlStructure = downloads[i].href.split("/");
    var oldlink = urlStructure[urlStructure.length -1];
    downloads[i].href = "#"; // TODO: This behavior is not expected. Only the download should start.
    downloads[i].onclick = downloadStarter(oldlink);
}
function downloadStarter(oldlink) {
    // This trivial extra function is necessary, because of the way closures work in javascript.
    return function () {return application.startDownload(oldlink)};
}

application.inputRefresh = function () {
    // this.id refers to the caller by name
    application.msg.wipe();

    application.refreshInput(this.id);

    var success = application.inputRefresh2();
    if (!success) {
        application.msg.warn("Hinweis:", "Aufgrund der aufgetretenen Fehler ist die Ausgabe eventuell veraltet.");
    }

    application.displayErrors();
}

application.refreshInput = function (source) {
    if (typeof(source) == "undefined") {
        // refresh all available inputs
        var result = true; // are there errors?
        for (i in application.inputs) {
            result = (result && application.refreshInput(i));
        }
        return result;
    }
    if (!(source in application.inputs)) {
        application.msg.error("Interner Fehler:",
                              "Ein nicht als Quelle geführtes Objekt hat eine Quellenaktuallisierung angefordert.");
        return false;
    }
    var rawData = application.inputs[source].value;

    var parsedData = application.parse[source](rawData);

    application.cache.parsedData[source] = parsedData;
    return true;
}

application.inputRefresh2 = function () {
//    var rawInputData = {};
//    for (i in application.inputs) {
//        rawInputData[i] = application.inputs[i].value;
//    }

//    var inputData = application.parseInput(rawInputData);
    var inputData = application.consolidateInput(application.cache.parsedData);

    if (typeof(inputData) == "undefined") {
        application.msg.error("Achtung!", "Die Eingabe wird vom Programm nicht verstanden.");
        return false;
    }

    if (application.cache.setParsed(inputData)) {
        // There is nothing todo, as the input data did not actually change
        return false;
    }

    // Input data has changed and we need to update the resulting data accordingly.

    var processedData = application.processData(inputData);

    if (typeof(processedData) == "undefined") {
        application.msg.error("Fehler!", "Die eingegebenen Daten werden zwar eingelesen, sind aber nicht ausreichend oder fehlerhaft.");
        return false;
    }

    if (application.cache.setProcessed(inputData)) {
        // Rendering doesn't need to be repeated,
        // as the real data did not actually change.
        return false;
    }

    // The processed data has changed and we need to update the outputs.

    for (o in application.outputs) {
        application.renderOutput[o](processedData);
    }

    // If no errors occurred, serialize the input data into a link.

    var serializedData = application.serialize(inputData);
    var serializedInputLink = document.location.href.split("#")[0] + "#" + serializedData;

    if (typeof(serializedInputLink) == "undefined") {
        application.msg.error("Fehler!", "Der Link kann nicht aktuallisert werden");
        return true;
    }

    application.staticLink.value = serializedInputLink;
    document.location.hash = "#"+serializedData;

    // Done.
    return true;
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




// The new warning and error module

application.msg = {
    errors : [],
    warnings : []
};

application.msg.error = function (caption, text) {
    application.msg.errors.push({
        caption : caption,
        text : text,
        cssClass : "alert alert-danger"
    })
};

application.msg.warn = function (caption, text) {
    application.msg.warnings.push({
        caption : caption,
        text : text,
        cssClass : "alert alert-warning"
    })
};

application.msg.genOneDOM = function (message) {
    var node = document.createElement("div");
    node.setAttribute("class", message.cssClass);
    node.setAttribute("role", "alert");
    node.innerHTML = "<strong>%1</strong> %2"
        .replace("%1", message.caption)
        .replace("%2", message.text);
    return node;
};

application.msg.genAllDOM = function () {
    return {
        errors : application.msg.errors.map(application.msg.genOneDOM),
        warnings : application.msg.warnings.map(application.msg.genOneDOM)
    }
};

application.msg.wipe = function () {
    application.msg.errors = [];
    application.msg.warnings = [];
}


application.displayErrors = function () {
    removeAllChildren(application.stderr);
    var messages = application.msg.genAllDOM();
    for (var i = 0; i < messages.errors.length; i++) {
        application.stderr.appendChild(messages.errors[i]);
    }
    for (var i = 0; i < messages.warnings.length; i++) {
        application.stderr.appendChild(messages.warnings[i]);
    }
}

function removeAllChildren (node) {
    while (node.hasChildNodes()) {
        node.removeChild(node.lastChild);
    }
}

// Some default parsers and processors
application.parseInput = function (x) {return x;};
application.processData = function (x) {return x;};
