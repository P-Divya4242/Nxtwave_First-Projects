const greetings = name => {
  console.log(`Hello ${name}`)
}

greetings('Raju')
greetings('Abhi')

// const calculator = require('./calculator.js');
// let { add, subtract } = calculator;
let { add, subtract } = require('./calculator.js');
console.log("Addition of 2 and 3 is:", add(2, 3));
console.log("Subtraction of 5 and 2 is:", subtract(5, 2));