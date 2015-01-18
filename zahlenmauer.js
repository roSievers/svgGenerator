/* The interactive part of the “Zahlenmauer” module.
 * requires Raphael for vector graphics and
 * rref to do linear algebra.
 */

var sourcecode;

var outputProblem;
var outputSolution;

function init () {
    sourcecode = document.getElementById("sourcecode");

    outputProblem = Raphael("output-problem", 300, 300);
    outputSolution = Raphael("output-solution", 300, 300);

    refreshOutput();
}

function refreshOutput () {
    // paper = Raphael("output-problem", 640, 480);
    var paper = outputSolution;

    paper.clear();
    paper.rect(10, 10, 30, 30);
    paper.text(12, 12, "12").attr({font : "15px Arial"});
    renderWall(outputProblem,
               [[{value:10, color:"black"}],
                [{value:4, color:"black"}, {value:6, color:"gray"}],
                [{value:1, color:"gray"}, {value:3, color:"black"}, {value:3, color:"gray"}]]);
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
    var result = [];
    for (i = 0; i < length; i++) {
        result.push(0);
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
            label.attr({font : "15px Arial", fill : data[row][col].color});
            var bbox = label.getBBox();
            label.attr({
                x : rect.attr("x") + boxwidth / 2,
                y : rect.attr("y") + boxheight / 2
            });
        }
    }
}
