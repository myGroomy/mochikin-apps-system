export function partitionOpnameLines<T extends { id: string }>(
  lines: T[],
  contributors: Array<{ id: string }>
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  const itemsPerContributor = Math.ceil(lines.length / contributors.length);

  lines.forEach((line, index) => {
    const personId = contributors[Math.floor(index / itemsPerContributor)].id;
    result.set(personId, [...(result.get(personId) || []), line]);
  });

  return result;
}
