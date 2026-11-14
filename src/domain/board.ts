export function isPeer(a: number, b: number): boolean {
  const rowA = Math.floor(a / 9), rowB = Math.floor(b / 9);
  const colA = a % 9, colB = b % 9;
  return rowA === rowB || colA === colB ||
    (Math.floor(rowA / 3) === Math.floor(rowB / 3) &&
      Math.floor(colA / 3) === Math.floor(colB / 3));
}
