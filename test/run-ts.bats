#!/usr/bin/env bats

RUN_TS="node $BATS_TEST_DIRNAME/../dist/run-ts.js"

setup() {
    cd "$BATS_TEST_DIRNAME/fixtures" || return 1
}

# Helper: run a test with both run-ts and tsx, verify identical output
run_both() {
    local file="$1"
    shift

    run $RUN_TS "$file" "$@"
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
    run $RUN_TS type-error.ts
    [ "$status" -ne 0 ]
}

@test "shows usage when no file given" {
    run $RUN_TS
    [ "$status" -eq 1 ]
    [[ "$output" == *"Usage:"* ]]
}

@test "works as shebang interpreter" {
    # Create temp bin dir with run-ts symlink
    local bindir
    bindir=$(mktemp -d)
    ln -s "$BATS_TEST_DIRNAME/../dist/run-ts.js" "$bindir/run-ts"
    chmod +x "$bindir/run-ts"
    chmod +x shebang.ts

    run env PATH="$bindir:$PATH" ./shebang.ts
    rm -rf "$bindir"

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

# Helper for shebang tests from different directories
setup_shebang_path() {
    local bindir
    bindir=$(mktemp -d)
    ln -s "$BATS_TEST_DIRNAME/../dist/run-ts.js" "$bindir/run-ts"
    chmod +x "$bindir/run-ts"
    echo "$bindir"
}

@test "shebang works from script's directory" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x calc/shebang-calc.ts

    cd calc
    run env PATH="$bindir:$PATH" ./shebang-calc.ts
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "shebang calc: 4" ]
}

@test "shebang works from parent directory" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x calc/shebang-calc.ts

    # Run from fixtures dir (parent of calc)
    run env PATH="$bindir:$PATH" ./calc/shebang-calc.ts
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "shebang calc: 4" ]
}

@test "shebang works from repo root" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x calc/shebang-calc.ts

    # Run from repo root
    cd "$BATS_TEST_DIRNAME/.."
    run env PATH="$bindir:$PATH" ./test/fixtures/calc/shebang-calc.ts
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "shebang calc: 4" ]
}

@test "shebang works from unrelated directory" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x calc/shebang-calc.ts

    # Run from /tmp
    cd /tmp
    run env PATH="$bindir:$PATH" "$BATS_TEST_DIRNAME/fixtures/calc/shebang-calc.ts"
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "shebang calc: 4" ]
}

@test "shebang passes arguments to script" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x shebang-args.ts

    run env PATH="$bindir:$PATH" ./shebang-args.ts hello world 123
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "hello world 123" ]
}

@test "shebang handles quoted arguments" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x shebang-args.ts

    run env PATH="$bindir:$PATH" ./shebang-args.ts "hello world" "with spaces"
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "hello world with spaces" ]
}

@test "shebang handles empty arguments" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x shebang-args.ts

    run env PATH="$bindir:$PATH" ./shebang-args.ts
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "" ]
}

@test "passes -N flag to node" {
    run $RUN_TS -Nno-warnings check-node-args.ts
    [ "$status" -eq 0 ]
    [ "$output" = "--no-warnings" ]
}

@test "multiple -N flags to node" {
    run $RUN_TS -Nno-warnings -Nno-deprecation check-node-args.ts
    [ "$status" -eq 0 ]
    [ "$output" = "--no-warnings --no-deprecation" ]
}

@test "shebang with -N flag" {
    local bindir
    bindir=$(setup_shebang_path)
    chmod +x shebang-node-arg.ts

    run env PATH="$bindir:$PATH" ./shebang-node-arg.ts
    rm -rf "$bindir"

    [ "$status" -eq 0 ]
    [ "$output" = "--no-warnings" ]
}

@test "-N flags with script args" {
    run $RUN_TS -Nno-warnings args.ts foo bar
    [ "$status" -eq 0 ]
    [ "$output" = "foo bar" ]
}
