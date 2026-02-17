
const hardString = "4/2/1+(6/3)*(5*5)-8+(2*5)/5+2/2" // = 25

// takes a string that contains two numbers and an operator in between them
// identifies an operator, turns num chars to left and right into ints
// solves equation and returns a number (not string)
// CANT HANDLE FLOATING POINT NUMBERS! (or exponents)
function evaluateEquation(singleEquationString){
    let result = null
    const operators = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
        '%': (a, b) => a % b,
        '**': (a, b) => a ** b
    };
    // needs to support multi digit nums
    // differentiate between nums and operators
    let firstNum = ""
    let operator = null
    let secondNum = ""
    for (let i = 0; i < singleEquationString.length; i++){
        let currentChar = singleEquationString[i]
        if (!Number.isNaN(parseInt(currentChar)) && operator === null){
            firstNum += currentChar
        } else if (Number.isNaN(parseInt(currentChar)) && currentChar in operators){
            operator = currentChar
        } else if (!Number.isNaN(parseInt(currentChar)) && operator != null){
            secondNum += currentChar
        }
    }
    result = operators[operator](parseInt(firstNum), parseInt(secondNum))
    return result
}

// loop through string, add characters until a paren is met
// when paren is met, find closing paren and evaluate equation between parens
// add solution to string, then keep adding chars until another paren is encountered
function evaluateEquationsInParens(firstEquationString){
    let newString = ""
    for (let i = 0; i < firstEquationString.length; i++){
        let currentChar = firstEquationString[i]
        let equationInParens = ""
        if (currentChar === "("){
            let j = i + 1
            while (j < firstEquationString.length && firstEquationString[j] != ")"){
                equationInParens += firstEquationString[j]
                j += 1
            }
            newString += evaluateEquation(equationInParens)
            // pay attention to where i is in string!!!
            i = j
        } else if (currentChar != "(" || currentChar != ")"){
            newString += currentChar
        }
    }
    return newString
}

// loop through equation string until a * or / is found
// create strings for numbers to left of operator and right of operator (add chars until another operator is identified or out of bounds of string)
// update a copy of the original string with result of multiplication or division equation spliced in
// continue until string is looped through and all * and / have been evaluated
function evlauateMultiplicationAndDivision(stringWithoutParens){
    let stringCopy = stringWithoutParens

    for (let i = 0; i < stringCopy.length; i++){
        let currentChar = stringCopy[i]

        if (currentChar == "*" || currentChar == "/"){

            let l = i - 1
            let r = i + 1
            // expand away from operator to the right until another operator is reached or string is over
            while (l >= 0 && !Number.isNaN(parseInt(stringCopy[l]))){
               l -= 1
            } 
            // expand left from operator until another operator is reached or out of bounds of start of string
            while (r <= stringCopy.length && !Number.isNaN(parseInt(stringCopy[r]))){
               r += 1
            }
            // Slice to only include first integer, operator, and second integer
            let equationString = stringCopy.slice(l + 1,r)
            
            let answer = evaluateEquation(equationString)
            let answerString = answer.toString()

            let equationStringLeft = stringCopy.slice(0,l + 1)
            let equationStringRight = stringCopy.slice(r, stringCopy.length)
            // set i to the end of the equation string before the ansewer is concated, so that the answer can be evaluated as part of the next equation
            i = equationStringLeft.length
            stringCopy = equationStringLeft.concat(answerString).concat(equationStringRight)
        }    
    }
    return stringCopy
}


// Recursive function for solving equation string with multiple equations
function solveFinalEquation(evaluatedString){
    let stringIsAnInt = true
    
    // flip to false if non int is found in input equation string
    for (let i = 0; i < evaluatedString.length; i++){
        let currentChar = evaluatedString[i]
        if (Number.isNaN(parseInt(currentChar))){
            stringIsAnInt = false
        } 
    }
    // BASE CASE occurs when input string is an int and has no operators, equation is finished, return result
    if (stringIsAnInt == true){
        return evaluatedString
    } else {
        // IF equation is NOT a pure int (has operators), then we loop through the string and isolate individual equations
        // start at begining of string and find index of second operator -> "1+2+3" = 3
        let secondOperatorIndex = null
        let nthOperator = 0
        let i = 0
        while (i <= evaluatedString.length && nthOperator < 2){
            let currentChar = evaluatedString[i]
            
            if (Number.isNaN(parseInt(currentChar))){
                nthOperator ++
                // SECOND TO LAST CASE WHEN THER IS NO SECOND OP!!!
                if (nthOperator == 2){
                    secondOperatorIndex = i
                } 
            } 
            i ++
        }
        // slice equation string at second operator, send to evaluateEquation(), then concat to rest of string
        let equation = evaluatedString.slice(0,secondOperatorIndex)
        let restOfString = evaluatedString.slice(secondOperatorIndex, evaluatedString.length)
        let solvedEquation = evaluateEquation(equation)
        let newString = solvedEquation.toString().concat(restOfString)
        return solveFinalEquation(newString)
    }
}

console.log(hardString)
let equationWithoutParens = evaluateEquationsInParens(hardString)
console.log(equationWithoutParens)
let equationWithoutMultiplicationAndDivision = evlauateMultiplicationAndDivision(equationWithoutParens)
console.log(equationWithoutMultiplicationAndDivision)
let answer = solveFinalEquation(equationWithoutMultiplicationAndDivision)
console.log(answer)
