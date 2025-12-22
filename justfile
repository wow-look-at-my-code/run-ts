[private]
default:
    @just --list

test:
    rm -rf dist
    npx tsx build.ts
    bats test/

alias build := test
