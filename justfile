[private]
default:
    @just --list

test:
    rm -rf dist
    npx tsx build.ts
    bats test/

alias build := test

update:
	npx npm-check-updates -u
	npm install --package-lock-only
