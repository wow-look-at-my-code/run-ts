#!/usr/bin/env run-ts

// This file has implicit 'any' types which fail with strict mode
// but should work if the local tsconfig.json (with strict:false) is used

function greet(name) {
	console.log(`Hello ${name}`);
}

greet("world");
