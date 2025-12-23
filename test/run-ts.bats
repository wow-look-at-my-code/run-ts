#!/usr/bin/env bats

setup() {
	cd "$BATS_TEST_DIRNAME/fixtures" || return 1
	export PATH="$BATS_TEST_DIRNAME/../dist:$PATH"
}

# Helper: run a test with both run-ts and tsx, verify identical output
run_both() {
	local file="$1"
	shift

	run "./$file" "$@"
	local rts_status=$status
	local rts_output="$output"

	run npx tsx "$file" "$@"
	local tsx_status=$status
	local tsx_output="$output"

	if [ "$rts_status" -ne "$tsx_status" ]; then
		echo "Status mismatch: run-ts=$rts_status tsx=$tsx_status"
		return 1
	fi
	if [ "$rts_output" != "$tsx_output" ]; then
		echo "Output mismatch:"
		echo "run-ts: $rts_output"
		echo "tsx: $tsx_output"
		return 1
	fi

	echo "$rts_output"
	return "$rts_status"
}

# Helper: run a TypeScript file in clean docker environment
# Usage: run_clean script.ts [file1 file2 ...]
# Uses docker compose with typescript pre-installed
run_clean() {
	local script="$1"
	shift

	local volume_args=()

	# Bind mount the script and any additional files
	for file in "$script" "$@"; do
		local basename="${file##*/}"
		volume_args+=("-v" "$BATS_TEST_DIRNAME/fixtures/$file:/work/$basename:ro")
	done

	local script_basename="${script##*/}"
	docker compose -f "$BATS_TEST_DIRNAME/docker-compose.yml" run --rm "${volume_args[@]}" run-ts-test run-ts "/work/$script_basename"
}

@test "runs a simple typescript file" {
	run run_both hello.ts
	[ "$status" -eq 0 ]
	[ "$output" = "hello world" ]
}

@test "handles local imports" {
	run run_both with-import.ts
	[ "$status" -eq 0 ]
	[ "$output" = "sum=5 product=20" ]
}

@test "passes arguments to the script" {
	run run_both args.ts foo bar baz
	[ "$status" -eq 0 ]
	[ "$output" = "foo bar baz" ]
}

@test "fails on type errors" {
	run run-ts type-error.ts
	[ "$status" -ne 0 ]
}

@test "shows usage when no file given" {
	run run-ts
	[ "$status" -eq 1 ]
	[[ "$output" == *"Usage:"* ]]
}

@test "works as shebang interpreter" {
	run ./shebang.ts
	[ "$status" -eq 0 ]
	[ "$output" = "shebang works" ]
}

@test "multi-file calculator with nested imports" {
	run run_both calc/main.ts '2 + 3' '4 * 5' '2 ^ 10' '(1 + 2) * (3 + 4)'
	[ "$status" -eq 0 ]
	[[ "$output" == *"2 + 3 = 5"* ]]
	[[ "$output" == *"4 * 5 = 20"* ]]
	[[ "$output" == *"2 ^ 10 = 1024"* ]]
	[[ "$output" == *"(1 + 2) * (3 + 4) = 21"* ]]
}


@test "shebang works from script's directory" {
	cd calc
	run ./shebang-calc.ts
	[ "$status" -eq 0 ]
	[ "$output" = "shebang calc: 4" ]
}

@test "shebang works from parent directory" {
	# Run from fixtures dir (parent of calc)
	run ./calc/shebang-calc.ts
	[ "$status" -eq 0 ]
	[ "$output" = "shebang calc: 4" ]
}

@test "shebang works from repo root" {
	# Run from repo root
	cd "$BATS_TEST_DIRNAME/.."
	run ./test/fixtures/calc/shebang-calc.ts
	[ "$status" -eq 0 ]
	[ "$output" = "shebang calc: 4" ]
}

@test "shebang works from unrelated directory" {
	# Run from /tmp
	cd /tmp
	run "$BATS_TEST_DIRNAME/fixtures/calc/shebang-calc.ts"
	[ "$status" -eq 0 ]
	[ "$output" = "shebang calc: 4" ]
}

@test "shebang passes arguments to script" {
	run ./shebang-args.ts hello world 123
	[ "$status" -eq 0 ]
	[ "$output" = "hello world 123" ]
}

@test "shebang handles quoted arguments" {
	run ./shebang-args.ts "hello world" "with spaces"
	[ "$status" -eq 0 ]
	[ "$output" = "hello world with spaces" ]
}

@test "shebang handles empty arguments" {
	run ./shebang-args.ts
	[ "$status" -eq 0 ]
	[ "$output" = "" ]
}

@test "passes -N flag to node" {
	run run-ts -Nno-warnings check-node-args.ts
	[ "$status" -eq 0 ]
	[ "$output" = "--no-warnings" ]
}

@test "multiple -N flags to node" {
	run run-ts -Nno-warnings -Nno-deprecation check-node-args.ts
	[ "$status" -eq 0 ]
	[ "$output" = "--no-warnings --no-deprecation" ]
}

@test "shebang with -N flag" {
	run ./shebang-node-arg.ts
	[ "$status" -eq 0 ]
	[ "$output" = "--no-warnings" ]
}

@test "-N flags with script args" {
	run run-ts -Nno-warnings args.ts foo bar
	[ "$status" -eq 0 ]
	[ "$output" = "foo bar" ]
}

@test "fails with implicit any when no tsconfig.json (tsc default is strict)" {
	run run_clean implicit-any-no-config.ts
	[ "$status" -ne 0 ]
}

@test "respects tsconfig.json with strict:false" {
	cd tsconfig-test
	run ./implicit-any.ts
	[ "$status" -eq 0 ]
	[ "$output" = "Hello world" ]
}

@test "respects tsconfig.json with strict:true" {
	cd tsconfig-strict
	run ./implicit-any.ts
	[ "$status" -ne 0 ]
}

@test "clean: respects tsconfig.json with strict:false" {
	run run_clean tsconfig-test/implicit-any.ts tsconfig-test/tsconfig.json
	[ "$status" -eq 0 ]
	[ "$output" = "Hello world" ]
}

@test "clean: respects tsconfig.json with strict:true" {
	run run_clean tsconfig-strict/implicit-any.ts tsconfig-strict/tsconfig.json
	[ "$status" -ne 0 ]
}

@test "handles tsconfig.json with paths and baseUrl" {
	cd tsconfig-paths
	run ./simple.ts
	[ "$status" -eq 0 ]
	[ "$output" = "Hello, world!" ]
}

@test "clean: handles tsconfig.json with paths and baseUrl" {
	run run_clean tsconfig-paths/simple.ts tsconfig-paths/tsconfig.json tsconfig-paths/src/helper.ts
	[ "$status" -eq 0 ]
	[ "$output" = "Hello, world!" ]
}

@test "handles files without .ts extension" {
	chmod +x no-extension
	run ./no-extension
	[ "$status" -eq 0 ]
	[ "$output" = "Script without .ts extension works!" ]
}

@test "clean: handles files without .ts extension" {
	run run_clean no-extension
	[ "$status" -eq 0 ]
	[ "$output" = "Script without .ts extension works!" ]
}
