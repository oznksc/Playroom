export function nanoid(): string {
  return crypto.randomUUID().slice(0, 21);
}
