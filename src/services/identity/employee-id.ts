const PREFIX = "EMP-";

export function formatEmployeeId(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(4, "0")}`;
}

export function parseEmployeeSequence(employeeId: string): number {
  const match = /^EMP-(\d+)$/.exec(employeeId);
  return match ? Number(match[1]) : 0;
}

export function nextEmployeeId(existing: string[]): string {
  const max = existing.reduce((current, id) => Math.max(current, parseEmployeeSequence(id)), 0);
  return formatEmployeeId(max + 1);
}
