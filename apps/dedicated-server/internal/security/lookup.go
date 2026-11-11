package security

import (
	"crypto/sha256"
	"encoding/hex"
)

// PasswordLookupKey derives a unique index for password-only accounts.
// Same password → same key (accounts must have distinct passwords).
func PasswordLookupKey(password string) string {
	sum := sha256.Sum256([]byte("anikitty-v1|" + password))
	return hex.EncodeToString(sum[:])
}
