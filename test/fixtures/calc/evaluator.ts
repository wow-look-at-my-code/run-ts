#!/usr/bin/env run-ts

import { ASTNode } from "./types.js";
import { power } from "./utils/math.js";

export function evaluate(node: ASTNode): number {
	switch (node.kind) {
		case "number":
			return node.value;

		case "unary":
			return -evaluate(node.operand);

		case "binary": {
			const left = evaluate(node.left);
			const right = evaluate(node.right);

			switch (node.op) {
				case "+": return left + right;
				case "-": return left - right;
				case "*": return left * right;
				case "/":
					if (right === 0) throw new Error("Division by zero");
					return left / right;
				case "^": return power(left, right);
			}
		}
	}
}
