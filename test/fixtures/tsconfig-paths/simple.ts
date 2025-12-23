#!/usr/bin/env run-ts
// Test that tsconfig with paths doesn't break compilation
import { greet } from "@/helper";

console.log(greet("world"));
