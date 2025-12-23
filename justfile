[private]
default:
    @just --list

test:
    rm -rf dist
    npx tsx build.ts
    docker compose -f test/docker-compose.yml build
    bats --print-output-on-failure test/

alias build := test

update:
	npx npm-check-updates -u
	npm install
