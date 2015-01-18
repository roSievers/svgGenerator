/* rref.js implements a simple algorithm to calculate the
 * reduced row echelon form of a matrix.
 */

/* rrefIp modifies the matrix in place.
 * It is assumed, that a square matrix is supplied which
 * has at least one row.
 */
function rrefIp (matrix) {
    var lead = 0;
    var rowCount = matrix.length;
    var columnCount = matrix[0].length;

    for (var row = 0; row < rowCount; row++) {
        if (columnCount < lead) {
            return matrix;
        }
        var i = row;
        while (matrix[i][lead] == 0) {
            i++;
            if (rowCount == i) {
                i = row;
                lead++;
                if (columnCount == lead) {
                    return matrix;
                }
            }
        }
        rrefSwapRowsIp(matrix, i, row);
        if (matrix[row][lead] != 0) {
            rrefMultiplyRowIp(matrix, row, 1 / matrix[row][lead]);
        }
        for (var j = 0; j < rowCount; j++) {
            if (j != row) {
                rrefAddRowMultipleIP(matrix, row, j, -matrix[j][lead]);
            }
        }
        lead++;
    }
    return matrix;
}

function rrefSwapRowsIp (matrix, i, j) {
    var temp = matrix[i];
    matrix[i] = matrix[j];
    matrix[j] = temp;
    return matrix;
}

function rrefAddRowMultipleIP (matrix, source, target, factor) {
    // Hier ist ein Zipper sicherlich die bessere Option.
    var summand1 = matrix[source].map(function (x) {return x * factor});
    var summand2 = matrix[target];

    for (var i = 0; i < summand1.length; i++) {
        summand2[i] = summand1[i] + summand2[i];
    }
    matrix[target] = summand2;
    return matrix;
}

function rrefMultiplyRowIp(matrix, target, factor) {
    matrix[target] = matrix[target].map(function (x) {return x * factor});
    return matrix;
}
