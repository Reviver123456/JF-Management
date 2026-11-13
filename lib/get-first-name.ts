export function getFirstName(label: string) {
  const trimmed = label.trim();

  if (!trimmed) {
    return trimmed;
  }

  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return trimmed;
  }

  return trimmed.slice(0, spaceIndex);
}
