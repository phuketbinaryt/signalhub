import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_FUTURES = ['6E', '6B', '6J', '6A', '6C', '6S', '6N', '6M'];

export function getPriceDecimals(ticker: string): number {
  const head = ticker.split(/[_!]/)[0].replace(/\d+$/, '');
  if (CURRENCY_FUTURES.includes(head)) return 5;
  const base = ticker.replace(/[!\d]+$/, '');
  if (CURRENCY_FUTURES.includes(base)) return 5;
  return 2;
}

export function formatPrice(price: number, ticker: string): string {
  return price.toFixed(getPriceDecimals(ticker));
}
