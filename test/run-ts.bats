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
