#!/usr/bin/env run-ts

export type TokenType = "number" | "operator" | "lparen" | "rparen" | "eof";

export interface Token {
    type: TokenType;
    value: string;
}

export type BinaryOp = "+" | "-" | "*" | "/" | "^";

export interface NumberNode {
    kind: "number";
    value: number;
}

export interface BinaryNode {
    kind: "binary";
    op: BinaryOp;
    left: ASTNode;
    right: ASTNode;
}

export interface UnaryNode {
    kind: "unary";
    op: "-";
    operand: ASTNode;
}

export type ASTNode = NumberNode | BinaryNode | UnaryNode;
