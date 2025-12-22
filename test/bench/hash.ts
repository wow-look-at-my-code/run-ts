#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// FNV-1a 64-bit (our implementation)
function fnv1a(data: Buffer): string
{
	let hash = 0xcbf29ce484222325n;
	for (const byte of data) {
		hash ^= BigInt(byte);
		hash = BigInt.asUintN(64, hash * 0x100000001b3n);
	}
	return hash.toString(16);
}

// Node crypto hashes
const cryptoHash = (algo: string) => (data: Buffer): string =>
	createHash(algo).update(data).digest("hex");

const md5 = cryptoHash("md5");
const sha1 = cryptoHash("sha1");
const sha256 = cryptoHash("sha256");

// Benchmark runner
function bench(name: string, fn: (data: Buffer) => string, data: Buffer, iterations: number): void
{
	// Warmup
	for (let i = 0; i < 100; i++) fn(data);

	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn(data);
	const elapsed = performance.now() - start;

	const opsPerSec = (iterations / elapsed) * 1000;
	const nsPerOp = (elapsed / iterations) * 1e6;
	console.log(`${name.padEnd(12)} ${opsPerSec.toFixed(0).padStart(10)} ops/sec  ${nsPerOp.toFixed(0).padStart(8)} ns/op`);
}

// Test data
const smallData = Buffer.from("hello world");
const mediumData = readFileSync(import.meta.filename); // this file (~1KB)
const largeData = Buffer.alloc(1024 * 1024, 0x42); // 1MB

console.log("\n=== Small data (11 bytes) ===");
bench("fnv1a", fnv1a, smallData, 100000);
bench("md5", md5, smallData, 100000);
bench("sha1", sha1, smallData, 100000);
bench("sha256", sha256, smallData, 100000);

console.log("\n=== Medium data (~1KB) ===");
bench("fnv1a", fnv1a, mediumData, 10000);
bench("md5", md5, mediumData, 10000);
bench("sha1", sha1, mediumData, 10000);
bench("sha256", sha256, mediumData, 10000);

console.log("\n=== Large data (1MB) ===");
bench("fnv1a", fnv1a, largeData, 100);
bench("md5", md5, largeData, 100);
bench("sha1", sha1, largeData, 100);
bench("sha256", sha256, largeData, 100);
