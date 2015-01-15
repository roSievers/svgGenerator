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
    return rows * (rows + 1) / 2
}

/* The function generateMatrix creates the matrix necessary to calculate
 * missing values in the wall. As parameters it takes the amount of rows
 * and a flat list of values. Use “undefined” for undefined values.
 */
function generateMatrix (rows, flatData) {
    // TODO.
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
