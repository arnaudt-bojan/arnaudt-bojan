const currencySymbols: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", CAD: "C$",
  AUD: "A$", NZD: "NZ$", CHF: "CHF", SEK: "kr", NOK: "kr",
  DKK: "kr", INR: "₹", BRL: "R$", MXN: "$", RUB: "₽",
  TRY: "₺", ZAR: "R", KRW: "₩", SGD: "S$", HKD: "HK$",
  TWD: "NT$", THB: "฿", MYR: "RM", IDR: "Rp", PHP: "₱",
  VND: "₫", AED: "د.إ", SAR: "﷼", ILS: "₪", PLN: "zł",
  CZK: "Kč", HUF: "Ft", RON: "lei", NGN: "₦", EGP: "E£"
};

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const symbol = currencySymbols[currencyCode] || currencyCode + " ";
  const decimals = ["JPY", "KRW", "VND", "IDR"].includes(currencyCode) ? 0 : 2;
  
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function formatCurrencyFromCents(cents: number, currencyCode: string = "USD"): string {
  return formatCurrency(cents / 100, currencyCode);
}

export function getCurrentCurrency(): string {
  return localStorage.getItem("selectedCurrency") || "USD";
}
