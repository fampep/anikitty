/**
 * At-rest encryption for user-generated text (comments, forum, chat, DMs).
 * Reuses AES-256-GCM via message-crypto; legacy plaintext rows still decrypt.
 */
export {
  encryptStoredMessage as encryptStoredText,
  decryptStoredMessage as decryptStoredText,
  assertMessageEncryptionConfigured as assertUgcEncryptionConfigured,
} from "@/lib/security/message-crypto";
