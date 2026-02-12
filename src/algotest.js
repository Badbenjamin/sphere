
const string = "1+3+25+8";
const hardString = "2+(6/3)+(5*5)-8+(2*2)" // = 25
// HARD STEPS

// evaluate all equations within parens and return new equation string

function evaluateParens(firstEquationString){

    let newString = ""
    for (let i = 0; i < firstEquationString.length; i++){
        let currentChar = firstEquationString[i]
        let equationInParens = ""
        if (currentChar === "("){
            
            let j = i + 1
            
            while (j < firstEquationString.length && firstEquationString[j] != ")"){
                // console.log(firstEquationString[j])
                equationInParens += firstEquationString[j]
                j += 1
            }
            newString += evaluateEquation(equationInParens)
            i = j
        } else if (currentChar != "(" || currentChar != ")"){
            newString += currentChar
        }
    }
    return newString
}

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
            // console.log(currentChar)
            firstNum += currentChar
        } else if (Number.isNaN(parseInt(currentChar)) && currentChar in operators){
            operator = currentChar
        } else if (!Number.isNaN(parseInt(currentChar)) && operator != null){
            secondNum += currentChar
        }
    // console.log('1',firstNum, 'o',operator,'2', secondNum)
    }
    // console.log(firstNum,operator, secondNum, operators[operator])
    result = operators[operator](parseInt(firstNum), parseInt(secondNum))
    
    return result
}

let finalEquation = evaluateParens(hardString)


// how to solve equation with multiple variables
// RECURSIVE????
function solveFinalEquation(evaluatedString){
    // console.log(evaluatedString)
    // let result = ""
    let stringIsAnInt = true
    
    // BASE CASE, check if string is an int 
    for (let i = 0; i < evaluatedString.length; i++){
        let currentChar = evaluatedString[i]
        if (Number.isNaN(parseInt(currentChar))){
            stringIsAnInt = false
        } 
    }
    // console.log(evaluatedString, stringIsAnInt)
    if (stringIsAnInt == true){
        // console.log(evaluatedString)
        return evaluatedString
    } else {
        // loop through and find binomial equation
        // slice at second operator, send to evaluateEquation(), then concat to front of string
        let secondOperatorIndex = null
        let nthOperator = 0
        // HOW DO I RETURN INDEX OF SECOND OPERATOR?
        let i = 0
        // how to acomodate last case when there is only one operator?
        while (i <= evaluatedString.length && nthOperator < 2){
            let currentChar = evaluatedString[i]
            
            if (Number.isNaN(parseInt(currentChar))){
                nthOperator ++
                // SECOND TO LAST CASE WHEN THER IS NO SECOND OP!!!
                if (nthOperator == 2){
                    secondOperatorIndex = i
                } 
                i ++ 
            } 
            i ++
        }
       
        let equation = evaluatedString.slice(0,secondOperatorIndex)
        let restOfString = evaluatedString.slice(secondOperatorIndex, evaluatedString.length)
        let newValue = evaluateEquation(equation)
        let newString = newValue.toString().concat(restOfString)
        return solveFinalEquation(newString)
    }
}

let answer = solveFinalEquation(finalEquation)
console.log(answer)
// console.log(solveFinalEquation(finalEquation))