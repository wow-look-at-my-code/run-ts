import esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["src/run-ts.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    minify: true,
    outfile: "dist/run-ts.js",
    banner: { js: "#!/usr/bin/env node" },
});
