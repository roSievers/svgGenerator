/* Implemention of a simple error monad
 */

var E = {};

E.error = function (caption, text) {
    return {
        type: "error",
        caption: caption,
        text: text
    }
}

// this is a really bad name, but Javascript has no decent type system...
E.pure = function (content) {
    return {
        type: "pure",
        content: content
    }
}

E.hasError = function (mValue) {
    return (mValue.type === "error");
}

// getError :: E a -> E Error
E.getError = function (mValue) {
    if (mValue.type === "error") {
        return E.pure(mValue)
    } else {
        return E.error("Monadic Error:", "The function E.getError was called on a value without error.");
    }
}

// handleError :: E a -> (Error -> E a) -> E a
E.handleError = function (mValue, handler) {
    if (mValue.type === "error") {
        return handler(mValue);
    } else {
        return mValue;
    }
}

// bind :: E a -> (a -> E b) -> E b
E.bind = function (mValue, mFunction) {
    if (mValue.type === "error") {
        return mValue;
    } else {
        return mFunction(mValue.content);
    }
}

// map :: E a -> (a -> b) -> E b
E.map = function (mValue, fnt) {
    if (mValue.type === "error") {
        return mValue;
    } else {
        return E.pure(fnt(mValue.content));
    }
}

// extract :: E a -> (Error -> a) -> a
E.extract = function (mValue, errorHandler) {
    if (mValue.type === "error") {
        return errorHandler(mValue);
    } else {
        return mValue.content;
    }
}

// sequence :: [E a] -> E [a]
// While a sequence function exists on a more abstract level here I choose to
// explicitly use the error structure to make it readable.
E.sequence = function (mValues) {
    var result = [];
    for (var i = 0; i < mValues.length; i++) {
        if (mValues[i].type === "error") {
            return mValues[i];
        } else {
            result.push(mValues[i].content);
        }
    }
    return E.pure(result);
}
