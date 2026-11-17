/**
 * Tunisian phone numbers: 8 national digits, optionally prefixed with +216 / 00216 / 216.
 * Accepts spaces, dots, dashes and parentheses. Normalises to "+216XXXXXXXX".
 */
export function normalizeTunisianPhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, "");
  const m = /^(?:\+216|00216|216)?([2-9]\d{7})$/.exec(digits);
  return m ? `+216${m[1]}` : null;
}

/** "+21622123456" -> "+216 22 123 456" */
export function formatTunisianPhone(normalized: string): string {
  const m = /^\+216(\d{2})(\d{3})(\d{3})$/.exec(normalized);
  return m ? `+216 ${m[1]} ${m[2]} ${m[3]}` : normalized;
}
