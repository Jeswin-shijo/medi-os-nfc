// No react-native imports: tested in plain Node.

/**
 * A revoked answer clears the stored key only when it came from the client that holds that key
 * and server. A late answer to an old request (sent before staff changed the key or server) must
 * not wipe the new key.
 */
export function shouldClearRevokedKey(
  stored: { apiUrl: string; key: string } | null,
  revoked: { apiUrl: string; key: string },
): boolean {
  return !!stored && stored.apiUrl === revoked.apiUrl && stored.key === revoked.key;
}
