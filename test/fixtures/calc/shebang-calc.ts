#!/usr/bin/env run-ts

import { Parser } from "./parser.js";
import { evaluate } from "./evaluator.js";

// Test expression when run via shebang
const result = evaluate(new Parser("2 + 2").parse());
console.log(`shebang calc: ${result}`);
