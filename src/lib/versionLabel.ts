/**
 * Version labels are dot-separated numbers: "1.0", "1.1", "2.3.1".
 *  - edit    : increment the last segment        (2.3   -> 2.4,   2.3.1 -> 2.3.2)
 *  - restore : append ".1" to the current head     (2.3   -> 2.3.1, 2.3.2 -> 2.3.2.1)
 *  - major   : bump the first segment, reset to .0 (2.3.1 -> 3.0)
 */
export const FIRST_LABEL = '1.0';

export function nextEditLabel(head: string): string {
  const parts = head.split('.').map(Number);
  parts[parts.length - 1] += 1;
  return parts.join('.');
}

export function restoreLabel(head: string): string {
  return `${head}.1`;
}

export function nextMajorLabel(head: string): string {
  return `${Number(head.split('.')[0]) + 1}.0`;
}
