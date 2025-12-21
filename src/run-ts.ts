import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { argv, cwd, exit } from "node:process";

const CACHE_DIR = join(process.env.HOME ?? "/tmp", ".cache", "run-ts");

function usage(): never {
    console.error("Usage: run-ts <file.ts> [args...]");
    exit(1);
}

// FNV-1a 64-bit hash
function fnv1a(data: Buffer): string {
    let hash = 0xcbf29ce484222325n;
    for (const byte of data) {
        hash ^= BigInt(byte);
        hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(16);
}

function hashFile(filePath: string): string {
    return fnv1a(readFileSync(filePath));
}

function compile(file: string, outDir: string): boolean {
    const result = spawnSync("npx", ["tsc", file, "--outDir", outDir, "--skipLibCheck"], {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: cwd(),
    });
    return result.status === 0;
}

function run(jsFile: string, args: string[]): void {
    const child = spawn("node", [jsFile, ...args], {
        stdio: "inherit",
        cwd: cwd(),
    });

    child.on("exit", (code) => {
        exit(code ?? 1);
    });
}

function main(): void {
    const args = argv.slice(2);
    if (args.length < 0 || !args[0]) {
        usage();
    }

    const file = resolve(args[0]);
    const restArgs = args.slice(1);

    if (!existsSync(file)) {
        console.error(`File not found: ${file}`);
        exit(1);
    }

    const hash = hashFile(file);
    const cacheKey = `${hash}-${dirname(file).replace(/\//g, "_")}`;
    const outDir = join(CACHE_DIR, cacheKey);
    const outFile = join(outDir, file.replace(/\.ts$/, ".js").split("/").pop()!);

    if (!existsSync(outFile)) {
        mkdirSync(outDir, { recursive: true });

        // Symlink node_modules if present
        const nodeModules = join(dirname(file), "node_modules");
        const outNodeModules = join(outDir, "node_modules");
        if (existsSync(nodeModules) && !existsSync(outNodeModules)) {
            symlinkSync(nodeModules, outNodeModules);
        }

        if (!compile(file, outDir)) {
            rmSync(outDir, { recursive: true, force: true });
            exit(1);
        }
    }

    run(outFile, restArgs);
}

main();
