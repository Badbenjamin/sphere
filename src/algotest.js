
// create a fnction that takes a string as input and parse it and execute it


// const string = "1+5+3+8"
// const string2 = "1+10+3+8"

// loop through string and find numbers

// let ints = []
// let operators = []
// for (let i = 0; i < string2.length; i ++){
//     let int = ""
//     if (isNaN(parseInt(string2[i]))){
//         operators.push(string2[i])
//     } else if (!isNaN(parseInt(string2[i])) && !isNaN(parseInt(string2[i + 1]))) {
//         // console.log(parseInt(string2[i]),parseInt(string2[i + 1]))
//         ints.push(string2[i]+string2[i+1])
//         i = i + 1
//     } else if ((!isNaN(parseInt(string2[i])) && isNaN(parseInt(string2[i + 1])))){
//         ints.push(string2[i])
//     }
//     // console.log(isNaN(parseInt(string2[i])))

// }
// console.log(operators)

const string = "1+3+25+8";
const hardString = "(6/3)+(5*5)-8" // = 19



// const addString = (input) => {
//   return input.split('+').map((char) => parseInt(char)).reduce((curr, acc) => curr + acc, 0);
// }

// console.log(addString(string));
// console.log(ints)