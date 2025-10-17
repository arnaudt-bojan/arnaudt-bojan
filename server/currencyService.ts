import { logger } from './logger';

interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyCache {
  rates: ExchangeRates;
  lastUpdated: number;
  baseCurrency: string;
}

interface CountryToCurrency {
  [countryCode: string]: string;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;
let cache: CurrencyCache | null = null;

const countryToCurrency: CountryToCurrency = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD",
  EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", GR: "EUR", FI: "EUR",
  JP: "JPY", CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN",
  RU: "RUB", TR: "TRY", ZA: "ZAR", KR: "KRW", SG: "SGD",
  HK: "HKD", TW: "TWD", TH: "THB", MY: "MYR", ID: "IDR",
  PH: "PHP", VN: "VND", AE: "AED", SA: "SAR", IL: "ILS",
  AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", CZ: "CZK",
  HU: "HUF", RO: "RON", NG: "NGN", EG: "EGP", KE: "KES",
  PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR"
};

async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    const rates: ExchangeRates = { USD: 1 };
    
    if (data.usd) {
      for (const [currency, rate] of Object.entries(data.usd)) {
        if (typeof rate === 'number') {
          rates[currency.toUpperCase()] = rate;
        }
      }
    }
    
    return rates;
  } catch (error) {
    logger.error("Error fetching exchange rates:", error);
    return { USD: 1 };
  }
}

export async function getExchangeRates(): Promise<CurrencyCache> {
  const now = Date.now();
  
  if (cache && (now - cache.lastUpdated) < CACHE_DURATION) {
    return cache;
  }
  
  const rates = await fetchExchangeRates();
  cache = {
    rates,
    lastUpdated: now,
    baseCurrency: "USD"
  };
  
  return cache;
}

export async function getUserCurrency(countryCode?: string): Promise<string> {
  if (!countryCode) {
    return "USD";
  }
  
  return countryToCurrency[countryCode.toUpperCase()] || "USD";
}

export function convertPrice(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  
  return Math.round(convertedAmount * 100) / 100;
}

export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: { [key: string]: string } = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", CAD: "C$",
    AUD: "A$", NZD: "NZ$", CHF: "CHF", SEK: "kr", NOK: "kr",
    DKK: "kr", INR: "₹", BRL: "R$", MXN: "$", RUB: "₽",
    TRY: "₺", ZAR: "R", KRW: "₩", SGD: "S$", HKD: "HK$",
    TWD: "NT$", THB: "฿", MYR: "RM", IDR: "Rp", PHP: "₱",
    VND: "₫", AED: "د.إ", SAR: "﷼", ILS: "₪"
  };
  
  const symbol = currencySymbols[currency] || currency + " ";
  const decimals = ["JPY", "KRW", "VND", "IDR"].includes(currency) ? 0 : 2;
  
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}
