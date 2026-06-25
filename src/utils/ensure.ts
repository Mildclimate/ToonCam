export function ensure(
  value: unknown,
  message = "Unexpected empty value",
): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
