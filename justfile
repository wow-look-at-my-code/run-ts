[private]
default:
    @just --list

test:
    tsx build.ts
    bats test/

alias build := test
