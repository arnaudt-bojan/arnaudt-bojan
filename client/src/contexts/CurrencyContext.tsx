import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyData {
  rates: ExchangeRates;
  lastUpdated: number;
  baseCurrency: string;
}

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  rates: ExchangeRates;
  convertPrice: (amount: number, fromCurrency?: string) => number;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  isLoading: boolean;
  availableCurrencies: string[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const currencySymbols: { [key: string]: string } = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", CAD: "C$",
  AUD: "A$", NZD: "NZ$", CHF: "CHF", SEK: "kr", NOK: "kr",
  DKK: "kr", INR: "₹", BRL: "R$", MXN: "$", RUB: "₽",
  TRY: "₺", ZAR: "R", KRW: "₩", SGD: "S$", HKD: "HK$",
  TWD: "NT$", THB: "฿", MYR: "RM", IDR: "Rp", PHP: "₱",
  VND: "₫", AED: "د.إ", SAR: "﷼", ILS: "₪", PLN: "zł",
  CZK: "Kč", HUF: "Ft", RON: "lei", NGN: "₦", EGP: "E£"
};

const popularCurrencies = [
  "USD", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "CHF",
  "INR", "BRL", "MXN", "SEK", "NOK", "DKK", "SGD", "HKD"
];

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem("selectedCurrency") || "USD";
  });

  const { data: ratesData, isLoading: ratesLoading } = useQuery<CurrencyData>({
    queryKey: ["/api/currency/rates"],
    staleTime: 24 * 60 * 60 * 1000,
    refetchInterval: 24 * 60 * 60 * 1000,
  });

  const { data: detectedCurrency } = useQuery<{ currency: string }>({
    queryKey: ["/api/currency/detect"],
    staleTime: Infinity,
    enabled: !localStorage.getItem("selectedCurrency"),
  });

  useEffect(() => {
    if (detectedCurrency && !localStorage.getItem("selectedCurrency")) {
      setCurrencyState(detectedCurrency.currency);
    }
  }, [detectedCurrency]);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("selectedCurrency", newCurrency);
  };

  const rates = ratesData?.rates || { USD: 1 };

  const convertPrice = (amount: number, fromCurrency: string = "USD"): number => {
    if (fromCurrency === currency) {
      return amount;
    }

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[currency] || 1;

    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;

    return Math.round(convertedAmount * 100) / 100;
  };

  const formatPrice = (amount: number, fromCurrency: string = "USD"): string => {
    const converted = convertPrice(amount, fromCurrency);
    const symbol = currencySymbols[currency] || currency + " ";
    const decimals = ["JPY", "KRW", "VND", "IDR"].includes(currency) ? 0 : 2;

    return `${symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  };

  const availableCurrencies = Object.keys(rates)
    .filter(curr => popularCurrencies.includes(curr))
    .sort();

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        convertPrice,
        formatPrice,
        isLoading: ratesLoading,
        availableCurrencies,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
