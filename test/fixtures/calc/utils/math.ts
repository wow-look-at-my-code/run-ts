#!/usr/bin/env run-ts

export function factorial(n: number): number {
    if (n < 0) throw new Error("factorial of negative number");
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

export function power(base: number, exp: number): number {
    return Math.pow(base, exp);
}

export function isClose(a: number, b: number, tolerance = 1e-9): boolean {
    return Math.abs(a - b) < tolerance;
}
