#!/usr/bin/env run-ts
declare var process: { argv: string[] };
console.log(process.argv.slice(2).join(" "));
