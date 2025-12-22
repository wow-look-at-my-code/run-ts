#!/usr/bin/env run-ts

import { Token, ASTNode, BinaryOp } from "./types.js";
import { Lexer } from "./lexer.js";

export class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(input: string) {
        this.tokens = new Lexer(input).tokenize();
    }

    private peek(): Token {
        return this.tokens[this.pos] ?? { type: "eof", value: "" };
    }

    private advance(): Token {
        return this.tokens[this.pos++] ?? { type: "eof", value: "" };
    }

    private expect(type: Token["type"]): Token {
        const tok = this.advance();
        if (tok.type !== type) {
            throw new Error(`Expected ${type}, got ${tok.type}`);
        }
        return tok;
    }

    parse(): ASTNode {
        const node = this.parseExpression();
        if (this.peek().type !== "eof") {
            throw new Error(`Unexpected token: ${this.peek().value}`);
        }
        return node;
    }

    private parseExpression(): ASTNode {
        return this.parseAddSub();
    }

    private parseAddSub(): ASTNode {
        let left = this.parseMulDiv();

        while (this.peek().type === "operator" && "+-".includes(this.peek().value)) {
            const op = this.advance().value as BinaryOp;
            const right = this.parseMulDiv();
            left = { kind: "binary", op, left, right };
        }

        return left;
    }

    private parseMulDiv(): ASTNode {
        let left = this.parsePower();

        while (this.peek().type === "operator" && "*/".includes(this.peek().value)) {
            const op = this.advance().value as BinaryOp;
            const right = this.parsePower();
            left = { kind: "binary", op, left, right };
        }

        return left;
    }

    private parsePower(): ASTNode {
        let left = this.parseUnary();

        if (this.peek().type === "operator" && this.peek().value === "^") {
            const op = this.advance().value as BinaryOp;
            const right = this.parsePower(); // right associative
            left = { kind: "binary", op, left, right };
        }

        return left;
    }

    private parseUnary(): ASTNode {
        if (this.peek().type === "operator" && this.peek().value === "-") {
            this.advance();
            const operand = this.parseUnary();
            return { kind: "unary", op: "-", operand };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): ASTNode {
        const tok = this.peek();

        if (tok.type === "number") {
            this.advance();
            return { kind: "number", value: parseFloat(tok.value) };
        }

        if (tok.type === "lparen") {
            this.advance();
            const expr = this.parseExpression();
            this.expect("rparen");
            return expr;
        }

        throw new Error(`Unexpected token: ${tok.type} (${tok.value})`);
    }
}
