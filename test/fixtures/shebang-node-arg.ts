#!/usr/bin/env -S run-ts -Nno-warnings
declare var process: { execArgv: string[] };
console.log(process.execArgv.join(" "));
