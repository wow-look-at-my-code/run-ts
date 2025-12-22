import esbuild from "esbuild";
import { chmod } from "node:fs/promises";

await esbuild.build({
	entryPoints: ["src/run-ts.ts"],
	bundle: true,
	platform: "node",
	format: "esm",
	minify: true,
	outfile: "dist/run-ts",
	banner: { js: "#!/usr/bin/env node" },
});

await chmod("dist/run-ts", 0o755);
