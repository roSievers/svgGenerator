/* The interactive part of the “Zahlenmauer” module.
 * requires Raphael for vector graphics and
 * rref to do linear algebra.
 */

var sourcecode;

var outputProblem;
var outputSolution;

var cache = "";

function init () {
    sourcecode = document.getElementById("sourcecode");

    outputProblem = Raphael("output-problem", 300, 300);
    outputSolution = Raphael("output-solution", 300, 300);

    refreshOutput();
}

function refreshOutput () {
    if (cache == sourcecode.value) {
        return;
    }
    var input = parseInput(sourcecode.value);

    if (input == undefined) {
        return;
    }

    cache = sourcecode.value;

    var rows = input.rows;
    var originalInformation = input.data;

    // var rows = 4;
    // var originalInformation = [14, undefined, undefined, 5, undefined, 3, undefined, 1, undefined, undefined];

    var matrix = generateMatrix(rows, originalInformation);
    rrefIp(matrix);
    // round all values.
    for (var row = 0; row < matrix.length; row++) {
        matrix[row] = matrix[row].map(rounding(-4));
    }
    var newInformation = parseMatrix(matrix);

    renderWall(outputProblem, generateColorPyramid(rows, [{info:originalInformation, color:"black"}]));

    if (newInformation != undefined) {
        renderWall(outputSolution, generateColorPyramid(rows, [{info:originalInformation, color:"black"}, {info:newInformation, color:"gray"}]));
    } else {
        renderError(outputSolution);
    }
}

function rounding (exponent) {
    return function (rnum) {
        return Math.round(rnum / Math.pow(2, exponent)) * Math.pow(2, exponent);
    }
}

/* Converts input of the type
 * 14
 * ?, ?
 * 5, ?, 3
 * ?, 1, ?, ?
 * into the more useful form
 * {lines:4, data:[14, undefined, undefined, 5, undefined, 3, undefined, 1, undefined, undefined]}.
 * Returns undefined on error.
 */
function parseInput (input) {
    var result = [];
    var lines = input.split("\n");
    for (var l = 0; l < lines.length; l++) {
        if (lines[l].trim() == "") { continue; }
        var entries = lines[l].split(",").map(
            function (x) {
                if (x.trim() == "?") { return undefined }
                return +x
            });
        result.push(entries);
    }

    // Now check, if the recived data is sane.
    for (var row = 0; row < result.length; row++) {
        if (result[row].length != row + 1) { return undefined; }
        for (var col = 0; col <= row; col++) {
            if (result[row][col] == NaN) { return undefined; }
        }
    }

    return {
        rows: result.length,
        data: result.reduce(function (prev, x) {return prev.concat(x);}, [])
    };
}

function startDownload (image) {
    open("data:image/svg+xml," + encodeURIComponent(document.getElementById(image).innerHTML));
}

/* generateColorPyramid turns flat information about the values into an expanded
 * form with color information for the renderer.
 */
function generateColorPyramid (rows, infos) {
    var flatStructure = generateConstantRow(infos[0].info.length, undefined);

    for (var i = 0; i < infos.length; i++) {
        for (j = 0; j < infos[i].info.length; j++) {
            if ((flatStructure[j] == undefined) && (infos[i].info[j] != undefined)) {
                // Cell is still empty but there is new information.
                flatStructure[j] = {value: infos[i].info[j], color: infos[i].color};
            }
        }
    }

    // Catch any remaining undefined fields and replace them by empty placeholders.
    for (j = 0; j < flatStructure.length; j++) {
        if (flatStructure[j] == undefined) {
            flatStructure[j] = {value:"", color:"black"};
        }
    }

    // Now expand the flat form into pyramid shape.
    var i = 0;
    var result = [];
    for (var row = 0; row < rows; row++) {
        var cellRow = [];
        for (var col = 0; col <= row; col++) {
            cellRow.push(flatStructure[i]);
            i++;
        }
        result.push(cellRow);
    }
    return result;
}

/* The datasize(rows) function calculates the amount of entries for a
 * given amount of rows.
 */
function datasize (rows) {
    return rows * (rows + 1) / 2;
}

/* Turns (row, col) coordinates into flat coordinates. */
function flattenCoord (row, col) {
    return row * (row + 1) / 2 + col;
}

/* Turns flat coordinates into (row, col) coordinates. */
// TODO: implementation;

/* The function generateMatrix creates the matrix necessary to calculate
 * missing values in the wall. As parameters it takes the amount of rows
 * and a flat list of values. Use “undefined” for undefined values.
 */
function generateMatrix (rows, flatData) {
    var matrix = [];
    var systemSize = datasize(rows) + 1;

    // First generate the linear equations inherent to the “Zahlenmauer” promlem.
    for (var row = 0; row < rows - 1; row++) {
        for (var col = 0; col <= row; col++) {
            var newRow = generateZeroRow(systemSize);
            newRow[flattenCoord(row,   col)] =  1;
            newRow[flattenCoord(row+1, col)] = -1;
            newRow[flattenCoord(row+1, col+1)] = -1;
            matrix.push(newRow);
        }
    }

    // Insert the known fields.
    for (var i = 0; i < systemSize - 1; i ++) {
        if (flatData[i] != undefined) {
            var newRow = generateZeroRow(systemSize);
            newRow[i] = 1;
            newRow[systemSize - 1] = flatData[i];
            matrix.push(newRow);
        }
    }
    return matrix;
}

function generateZeroRow (length) {
    return generateConstantRow(length, 0);
}

function generateConstantRow (length, value) {
    var result = [];
    for (i = 0; i < length; i++) {
        result.push(value);
    }
    return result;
}

/* parseMatrix pulls information from the result, after the rref algorithm has run.
 * It may return:
 * 1. undefined, if the input implies 1 == 0.
 * 2. A flat list of numbers (or undefined), which represent the known values.
 */
function parseMatrix (matrix) {
    // Check if the last row contains only zeroes but the last one is nonzero. (0 == 1)
    if (matrix[matrix.length - 1].slice(0, -1).every(function (x) {return (x == 0);})
       && (matrix[matrix.length - 1].slice(-1)[0] != 0) ) {
        return undefined;
    }

    var datasize = matrix[0].length;
    var result = generateConstantRow(datasize - 1, undefined);
    for (var equation = 0; equation < matrix.length; equation++) {
        var nonzeroEntries = matrix[equation].slice(0, -1).map(
                function (x, index) {return {value : x, index: index};}
            ).filter( function (x) {return x.value != 0} );

        if (nonzeroEntries.length != 1) {
            continue; // This equation isn't simple.
        }

        // Now it is certain, that matrix[equation] indeed contains an equation.
        result[nonzeroEntries[0].index] = matrix[equation][datasize - 1];
    }
    return result;
}

/* renderWall (paper, data) takes data in the form:
 * [[10], [4, 6], [1, 3, 3]]
 * behavior for other types of input are undefined.
 */
function renderWall (paper, data) {
    var margin = 5;
    var boxwidth = 50;
    var boxheight = 20;
    var rows = data.length;
    var middle = margin + rows * boxwidth / 2;
    paper.setSize(middle * 2, 2* margin + rows * boxheight);
    paper.clear();
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col <= row; col++) {
            var rect = paper.rect(middle + (col - (row + 1) / 2) * boxwidth,
                       margin + row * boxheight, boxwidth, boxheight);
            var label = paper.text(0, 0, data[row][col].value);
            label.attr({
                font : "15px Arial",
                fill : data[row][col].color,
                x : rect.attr("x") + boxwidth / 2,
                y : rect.attr("y") + boxheight / 2
            });
        }
    }
}

function renderError (paper) {
    paper.clear();
    var label = paper.text(0, 0, "0 = 1");
    label.attr({font:"15px Arial", fill: "red"});
    bbox = label.getBBox();
    label.attr({
        x : bbox.width / 2 + 20,
        y : bbox.height / 2 + 20
    })
}
