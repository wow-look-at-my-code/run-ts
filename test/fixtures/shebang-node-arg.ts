#!/usr/bin/env -S run-ts --node-arg=--version
declare var process: { argv: string[] };
console.log("this should not print");
