/**
 * Server-only symmetric encryption for bot payout credentials
 * (EVM private keys, TON 24-word phrases). Never import from the browser.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key(): Buffer {
  const raw = process.env["WALLET_ENC_KEY"];
  if (!raw) throw new Error("WALLET_ENC_KEY is not configured");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** Masked preview so admins can confirm a key is stored without exposing it. */
export function maskSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const v = decryptSecret(stored);
    if (v.includes(" ")) {
      const words = v.trim().split(/\s+/);
      return `${words[0]} ••• ${words[words.length - 1]} (${words.length} words)`;
    }
    return `${v.slice(0, 6)}••••${v.slice(-4)}`;
  } catch {
    return "••••••";
  }
}
