#!/usr/bin/env run-ts

import { Parser } from "./parser.js";
import { evaluate } from "./evaluator.js";

// Non-interactive mode for testing: evaluate expressions from argv
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log("Usage: calc <expression> [expression...]");
    console.log("Example: calc '2 + 3 * 4' '(1 + 2) ^ 3'");
    process.exit(1);
}

for (const expr of args) {
    const parser = new Parser(expr);
    const ast = parser.parse();
    const result = evaluate(ast);
    console.log(`${expr} = ${result}`);
}
