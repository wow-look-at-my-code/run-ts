#!/usr/bin/env run-ts

import { Token, TokenType } from "./types.js";

export class Lexer {
    private pos = 0;
    private input: string;

    constructor(input: string) {
        this.input = input.trim();
    }

    private peek(): string {
        return this.input[this.pos] ?? "";
    }

    private advance(): string {
        return this.input[this.pos++] ?? "";
    }

    private skipWhitespace(): void {
        while (/\s/.test(this.peek())) this.advance();
    }

    private readNumber(): string {
        let num = "";
        while (/[\d.]/.test(this.peek())) {
            num += this.advance();
        }
        return num;
    }

    nextToken(): Token {
        this.skipWhitespace();

        const ch = this.peek();

        if (ch === "") return { type: "eof", value: "" };

        if (/\d/.test(ch) || (ch === "." && /\d/.test(this.input[this.pos + 1] ?? ""))) {
            return { type: "number", value: this.readNumber() };
        }

        if ("+-*/^".includes(ch)) {
            this.advance();
            return { type: "operator", value: ch };
        }

        if (ch === "(") {
            this.advance();
            return { type: "lparen", value: ch };
        }

        if (ch === ")") {
            this.advance();
            return { type: "rparen", value: ch };
        }

        throw new Error(`Unexpected character: ${ch}`);
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];
        let tok: Token;
        do {
            tok = this.nextToken();
            tokens.push(tok);
        } while (tok.type !== "eof");
        return tokens;
    }
}
