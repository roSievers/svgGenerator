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

function keys (dict) {
    result = [];
    for (i in dict) {
        result.push(i);
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
    var pseudorandomSuffix = Sha1.hash(""+application.cache.serializedData).slice(-3);
    var filename = container + "-" +pseudorandomSuffix+ ".svg";
    saveAs(blob, filename);
};

/* Transform all the download links */
var downloads = document.getElementsByClassName("application-download");
for (var i = 0; i < downloads.length; i++) {
    var urlStructure = downloads[i].href.split("/");
    var oldlink = urlStructure[urlStructure.length -1];
    downloads[i].removeAttribute("href");
    downloads[i].onclick = downloadStarter(oldlink);
}
function downloadStarter(oldlink) {
    // This trivial extra function is necessary, because of the way closures work in javascript.
    return function () {return application.startDownload(oldlink)};
}

application.refreshEverything = function () {
    // this.id refers to the caller by name
    application.msg.wipe();

    var parsedData = E.map(application.refreshInputs(this.id),
                           application.consolidateInput);

    var processedData = E.bind(parsedData, application.processData);
    E.map(processedData, application.refreshOutputs);

    E.handleError(processedData, application.msg.errorFromMonad);

    var serializedData = E.bind(parsedData, function (parsedData) {
        var serializedData = application.serialize(parsedData);
        E.map(serializedData, application.refreshLink);
        E.handleError(serializedData, application.msg.errorFromMonad);
        return serializedData;
    })
    E.bind(serializedData, function (serializedData) {application.cache.serializedData = serializedData});

    if (E.hasError(processedData)) {
        // The application did fail before producing new output.
        application.msg.warn("Hinweis:", "Aufgrund der aufgetretenen Fehler ist die Ausgabe eventuell veraltet.");
    }

    application.displayErrors();
}

// source is an optional parameter. If it is undefined, all inputs will be refreshed.
application.refreshInputs = function (source) {
    var newData;
    if (typeof(source) == "undefined") {
        // refresh all available inputs
        newData = E.sequence( // makes sure to collect only one error
            keys(application.inputs).map(application.refreshInput)
        );
    } else {
        newData = E.sequence([application.refreshInput(source)]);
    }

    return E.bind(newData, function (newData) {
        for (var i = 0; i < newData.length; i++) {
            application.cache.parsedData[newData[i].id] = newData[i].data;
        }
        return E.pure(application.cache.parsedData);
    });
}

// application.refreshInput :: id -> E data
application.refreshInput = function (source) {
   if (!(source in application.inputs)) {
        return E.error("Interner Fehler:",
                       "Ein nicht als Quelle geführtes Objekt hat eine Quellenaktuallisierung angefordert.");
    }

    var parsedData = application.parse[source](
        application.inputs[source].value
    );
    return E.map(parsedData, function (x) {return {id:source, data:x}});
}

application.refreshOutputs = function (processedData) {
    for (o in application.outputs) {
        application.renderOutput[o](processedData);
    }
}

application.refreshLink = function (serializedData) {
    var serializedInputLink = document.location.href.split("#")[0] + "#" + serializedData;

    application.staticLink.value = serializedInputLink;
    document.location.hash = "#"+serializedData;
}

application.init = function () {
    serializedData = document.location.hash;
    recreatedInput = application.deserialize(serializedData);
    if (typeof(recreatedInput) != undefined) {
        for (i in recreatedInput) {
            application.inputs[i].value = recreatedInput[i];
        }
    }
    application.refreshEverything();
}

/* Hook up all input elements */
for (i in application.inputs) {
    application.inputs[i].onkeyup = application.refreshEverything;
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

application.msg.errorFromMonad = function (mError) {
    application.msg.error(mError.caption, mError.text);
    return E.pure(undefined); // All errors have been catched.
}

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


/* Default implementation of application.consolidateInput.
 * It will create a single object which has all the properties
 * of the small objects together.
 */
application.consolidateInput = function (inputs) {
    var result = {};
    for (i in inputs) {
        for (key in inputs[i]) {
            if (key in result) {
                application.msg.error("Interner Fehler:",
                                      "Die verschiedenen Lesefunktionen geben wiedersprüchliche Werte zurück.");
            } else {
                result[key] = inputs[i][key];
            }
        }
    }
    return result;
}

