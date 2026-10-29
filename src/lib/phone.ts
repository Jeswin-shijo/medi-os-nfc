// No react-native or expo imports here: the tests run in plain Node.

/** '9876543210' → '98765 43210'. Works on a partly typed number too; extra characters are dropped. */
export function formatIndianMobile(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/** Ten digits, the first one 6 to 9 (Indian mobile numbers). */
export function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}
