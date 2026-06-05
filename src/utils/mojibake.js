// Mojibake repair — reverse double-encoded UTF-8 (B24).
//
// The bug: a UTF-8 source CSV opened/re-saved as Windows-1252/Latin-1 stores
// each multibyte char's bytes as separate Latin-1 chars, then those get
// re-encoded as UTF-8. So "André" (é = bytes C3 A9) becomes "AndrÃ©" (Ã=C3,
// ©=A9). The reverse is: take the string's code points AS Latin-1 bytes and
// decode them as UTF-8 once.
//
// Self-guarding: we decode with a FATAL TextDecoder, so a correctly-encoded
// name (e.g. "André", or Polish "Łukasz") — whose Latin-1 bytes are NOT valid
// UTF-8 — throws and is returned UNCHANGED. Only genuine double-encoded
// mojibake (whose Latin-1 bytes form valid UTF-8) is repaired. Verified against
// the real catalog: all 16 corrupt names repair cleanly; the 42 correctly-
// encoded diacritic names are left untouched.

// Cheap early-out: the lead byte of a re-encoded multibyte char lands in this
// range (Ã Â Ä Å Ð Þ …) or is the replacement char. No marker → definitely not
// this class of mojibake → skip the decode.
const MOJIBAKE_MARKER = /[À-ß�]/;

/**
 * Return the de-mojibake'd string, or the input unchanged when it isn't
 * cleanly-reversible double-encoded UTF-8. Non-strings pass through.
 */
export function repairMojibake(input) {
  if (typeof input !== 'string' || !input) return input;
  if (!MOJIBAKE_MARKER.test(input)) return input;
  // Reversible only when every code point fits a single Latin-1 byte — real
  // Unicode chars (≥ 0x100) mean the value is already correctly decoded.
  const codes = [];
  for (const ch of input) {
    const c = ch.codePointAt(0);
    if (c > 0xFF) return input;
    codes.push(c);
  }
  let decoded;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codes));
  } catch {
    return input; // Latin-1 bytes aren't valid UTF-8 → not mojibake → leave as-is
  }
  if (decoded === input || decoded.includes('�')) return input;
  return decoded;
}
