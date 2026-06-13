export function formatDecimalInputValue(raw: string) {
  let result = "";
  let hasDot = false;

  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }

    if (char === "." && !hasDot) {
      hasDot = true;
      result += char;
    }
  }

  return result;
}

export function isDecimalLikeField(field: { label: string; type?: string }) {
  return field.type === "decimal";
}
