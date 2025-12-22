[private]
default:
    @just --list

test:
    npx tsx build.ts
    bats test/

alias build := test
