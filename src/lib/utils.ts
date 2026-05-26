import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FUTURES_DECIMALS: Record<string, number> = {
  '6E': 5,
  '6B': 4,
  '6J': 7,
  '6A': 5,
  '6C': 5,
  '6S': 4,
  '6N': 4,
  '6M': 6,
  'NG': 3,
  'QG': 3,
  'HG': 4,
};

const MONTH_CODES = 'FGHJKMNQUVXZ';

export function getPriceDecimals(ticker: string): number {
  const head = ticker.split(/[_!]/)[0];
  const candidates = [
    head.replace(/\d+$/, ''),
    head.replace(new RegExp(`[${MONTH_CODES}]\\d{1,4}$`), ''),
    ticker.replace(/[!\d]+$/, ''),
    ticker.replace(new RegExp(`[${MONTH_CODES}]\\d{1,4}$`), ''),
  ];
  for (const c of candidates) {
    if (FUTURES_DECIMALS[c]) return FUTURES_DECIMALS[c];
  }
  return 2;
}

export function formatPrice(price: number, ticker: string): string {
  return price.toFixed(getPriceDecimals(ticker));
}
