import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cwd, exit, stderr } from "node:process";
import { Args, flag, option, parseArgs, positional } from "@wow-look-at-my-code/args";

interface TsConfig
{
	compilerOptions?: Record<string, unknown>;
}

const CACHE_DIR = join(process.env.HOME ?? "/tmp", ".cache", "run-ts");
const ANSI_GRAY = "\x1b[90m";
const ANSI_RESET = "\x1b[0m";

class Config extends Args
{
	@flag("--[S]tatus", "Show status output")
	showStatus = false;

	@option("--[N]ode-arg", "Pass argument to node (e.g., -Ninspect becomes --inspect)", { transform: (v) => "--" + v })
	nodeArgs: string[] = [];

	@positional("file.ts", "TypeScript file to run", { required: true })
	file = "";
}

const config = parseArgs(new Config());

function status(msg: string): void
{
	if (config.showStatus) {
		stderr.write(`${ANSI_GRAY}${msg}${ANSI_RESET}\n`);
	}
}

function timed<T>(label: string, fn: () => T): T
{
	const start = performance.now();
	const result = fn();
	const ms = (performance.now() - start).toFixed(0);
	status(`${label} ${ms}ms`);
	return result;
}

function hashFile(filePath: string): string
{
	return createHash("sha1").update(readFileSync(filePath)).digest("hex");
}

function findTsConfig(startDir: string): string | null
{
	let dir = startDir;
	while (dir !== "/") {
		const tsconfig = join(dir, "tsconfig.json");
		if (existsSync(tsconfig)) {
			return tsconfig;
		}
		dir = dirname(dir);
	}
	return null;
}

function readTsConfig(tsconfigPath: string): TsConfig
{
	const content = readFileSync(tsconfigPath, "utf-8");
	return JSON.parse(content);
}

function compile(file: string, outDir: string): boolean
{
	const args = ["tsc", file, "--outDir", outDir];

	const tsconfigPath = findTsConfig(dirname(file));
	if (tsconfigPath) {
		const tsconfig = readTsConfig(tsconfigPath);
		if (tsconfig.compilerOptions) {
			for (const [key, value] of Object.entries(tsconfig.compilerOptions)) {
				// Skip options that tsc doesn't allow on command line or we set ourselves
				if (key === "outDir" || key === "rootDir" || key === "paths" || key === "baseUrl") continue;
				if (typeof value === "boolean") {
					// Only pass true boolean flags, tsc defaults handle false values
					if (value) {
						args.push(`--${key}`);
					}
				} else {
					args.push(`--${key}`, String(value));
				}
			}
		}
	} else {
		// No tsconfig.json found, default to strict mode with node types
		args.push("--strict", "--types", "node");
	}

	const result = spawnSync("npx", args, {
		stdio: ["inherit", "inherit", "inherit"],
		cwd: cwd(),
	});
	return result.status === 0;
}

function run(jsFile: string, nodeArgs: string[], scriptArgs: string[]): void
{
	const child = spawn("node", [...nodeArgs, jsFile, ...scriptArgs], {
		stdio: "inherit",
		cwd: cwd(),
	});

	child.on("exit", (code) =>
	{
		exit(code ?? 1);
	});
}

function main(): void
{
	const file = resolve(config.file);

	if (!existsSync(file)) {
		throw new Error(`File not found: ${file}`);
	}

	let hash = timed("hashing...", () => hashFile(file));

	// Include tsconfig in cache key to invalidate cache when tsconfig changes
	const tsconfigPath = findTsConfig(dirname(file));
	if (tsconfigPath) {
		const tsconfigHash = hashFile(tsconfigPath);
		hash = `${hash}-${tsconfigHash}`;
	}

	const cacheKey = `${hash}-${dirname(file).replace(/\//g, "_")}`;
	const outDir = join(CACHE_DIR, cacheKey);

	// If file doesn't have .ts extension, create a symlink with .ts extension
	let fileToCompile = file;
	const hasTsExtension = file.endsWith(".ts");
	if (!hasTsExtension) {
		const tsSymlink = join(outDir, `${file.split("/").pop()}.ts`);
		mkdirSync(outDir, { recursive: true });
		if (!existsSync(tsSymlink)) {
			symlinkSync(file, tsSymlink);
		}
		fileToCompile = tsSymlink;
	}

	const outFile = join(outDir, fileToCompile.replace(/\.ts$/, ".js").split("/").pop()!);

	if (!existsSync(outFile)) {
		mkdirSync(outDir, { recursive: true });

		// Symlink node_modules if present
		const nodeModules = join(dirname(file), "node_modules");
		const outNodeModules = join(outDir, "node_modules");
		if (existsSync(nodeModules) && !existsSync(outNodeModules)) {
			symlinkSync(nodeModules, outNodeModules);
		}

		const ok = timed("compiling...", () => compile(fileToCompile, outDir));
		if (!ok) {
			rmSync(outDir, { recursive: true, force: true });
			exit(1);
		}
	}

	status(`executing ${file} from ${outFile}`);
	run(outFile, config.nodeArgs, config.remainingArgs);
}

main();
