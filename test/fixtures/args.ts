#!/usr/bin/env run-ts
import { argv } from "node:process";
console.log(argv.slice(2).join(" "));
