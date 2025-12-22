import { argv, exit } from "node:process";

interface OptionMeta<T>
{
	transform?: (value: string) => T;
}

interface PositionalMeta
{
	required?: boolean;
}

interface RegisteredArgBase<T>
{
	property: string;
	long: string;
	short?: string;
	description: string;

	match(input: string): T | null;
}

class RegisteredFlag implements RegisteredArgBase<boolean>
{
	constructor(
		public property: string,
		public long: string,
		public short: string | undefined,
		public description: string,
	) {}

	match(input: string): boolean | null
	{
		if (this.short && input === `-${this.short}`)
			return true;
		if (input === `--${this.long}`)
			return true;
		return null;
	}
}

class RegisteredOption<T = string> implements RegisteredArgBase<T>
{
	constructor(
		public property: string,
		public long: string,
		public short: string | undefined,
		public description: string,
		public transform?: (value: string) => T,
	) {}

	match(input: string): T | null
	{
		let value: string | null = null;
		if (this.short && input.startsWith(`-${this.short}`))
			value = input.slice(2);
		else if (input.startsWith(`--${this.long}=`))
			value = input.slice(this.long.length + 3);
		if (value === null)
			return null;
		return this.transform ? this.transform(value) : value as T;
	}
}

class RegisteredPositional implements RegisteredArgBase<string>
{
	constructor(
		public property: string,
		public long: string,
		public short: string | undefined,
		public description: string,
		public required?: boolean,
	) {}

	match(input: string): string
	{
		return input;
	}
}

type RegisteredArg = RegisteredFlag | RegisteredOption<unknown> | RegisteredPositional;

interface ArgRegistry
{
	args: RegisteredArg[];
}

const classRegistries = new WeakMap<Function, ArgRegistry>();

function getRegistry(ctor: Function): ArgRegistry
{
	let registry = classRegistries.get(ctor);
	if (!registry) {
		registry = { args: [] };
		classRegistries.set(ctor, registry);
	}
	return registry;
}

export abstract class Args
{
	remainingArgs: string[] = [];
}

// Parse name format: "--long-name" or "--long-n[A]me" where [A] is short opt
function parseName(name: string): { long: string; short?: string; }
{
	const match = name.match(/^--(.+)\[(.)\](.*)$/);
	if (match) {
		const long = (match[1] + match[2].toLowerCase() + match[3]);
		return { long, short: match[2] };
	}
	if (!name.startsWith("--"))
		throw new Error(`Invalid option name: ${name}`);
	return { long: name.slice(2) };
}

export function flag(name: string, description: string): PropertyDecorator
{
	return (target, property) =>
	{
		const { long, short } = parseName(name);
		getRegistry(target.constructor).args.push(new RegisteredFlag(property as string, long, short, description));
	};
}

export function option<T = string>(name: string, description: string, meta?: OptionMeta<T>): PropertyDecorator
{
	return (target, property) =>
	{
		const { long, short } = parseName(name);
		getRegistry(target.constructor).args.push(new RegisteredOption(property as string, long, short, description, meta?.transform));
	};
}

export function positional(name: string, description: string, meta?: PositionalMeta): PropertyDecorator
{
	return (target, property) =>
	{
		const { long, short } = parseName(name);
		getRegistry(target.constructor).args.push(new RegisteredPositional(property as string, long, short, description, meta?.required));
	};
}

function generateUsage(programName: string, registry: ArgRegistry): string
{
	const parts = [programName];

	for (const arg of registry.args) {
		const short = arg.short ? `-${arg.short}|` : "";
		if (arg instanceof RegisteredFlag) {
			parts.push(`[${short}--${arg.long}]`);
		} else if (arg instanceof RegisteredOption) {
			parts.push(`[${short}--${arg.long}=<arg>]`);
		} else if (arg instanceof RegisteredPositional) {
			if (arg.required) {
				parts.push(`<${arg.long}>`);
			} else {
				parts.push(`[${arg.long}]`);
			}
		}
	}

	parts.push("[args...]");

	return `Usage: ${parts.join(" ")}`;
}

export function parseArgs<T extends Args>(config: T): T
{
	const registry = getRegistry(config.constructor);
	const obj = config as Record<string, unknown>;
	const programName = argv[1];
	const args = argv.slice(2);
	let i = 0;

	const positionals = registry.args.filter((a): a is RegisteredPositional => a instanceof RegisteredPositional);
	let positionalIndex = 0;

	while (i < args.length) {
		const input = args[i];
		let matched = false;

		for (const arg of registry.args) {
			if (arg instanceof RegisteredPositional)
				continue;

			const result = arg.match(input);
			if (result === null)
				continue;

			if (arg instanceof RegisteredFlag) {
				obj[arg.property] = true;
			} else if (arg instanceof RegisteredOption) {
				(obj[arg.property] as unknown[]).push(result);
			}
			matched = true;
			break;
		}

		if (!matched) {
			if (input.startsWith("-")) {
				console.error(`Unknown option: ${input}`);
				console.error(generateUsage(programName, registry));
				exit(1);
			}
			break; // positional args start here
		}

		i++;
	}

	while (positionalIndex < positionals.length && i < args.length) {
		const arg = positionals[positionalIndex];
		obj[arg.property] = args[i];
		positionalIndex++;
		i++;
	}

	while (positionalIndex < positionals.length) {
		if (positionals[positionalIndex].required) {
			console.error(generateUsage(programName, registry));
			exit(1);
		}
		positionalIndex++;
	}

	config.remainingArgs = args.slice(i);

	return config;
}
