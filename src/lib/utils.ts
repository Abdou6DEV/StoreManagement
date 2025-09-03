import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function for safe multiplication with precision
export function safeMultiply(a: number, b: number): number {
  return parseFloat((a * b).toFixed(2));
}
