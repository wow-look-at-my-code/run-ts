#!/usr/bin/env -S run-ts -Nno-warnings
import { execArgv } from "node:process";
console.log(execArgv.join(" "));
