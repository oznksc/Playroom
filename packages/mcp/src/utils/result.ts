export function toolJson(
  data: unknown,
  isError = false
): {
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
} {
  const payload = {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
  return isError ? { ...payload, isError: true } : payload;
}
