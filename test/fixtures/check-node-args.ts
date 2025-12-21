declare var process: { execArgv: string[], argv: string[] };
// Print node's execArgv (the args passed to node itself)
console.log(process.execArgv.join(" "));
