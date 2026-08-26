export type CursorPage<T extends { id: string }> = {
  items: T[];
  hasNext: boolean;
  nextCursor?: string;
};

export function paginateCursorRows<T extends { id: string }>(rows: readonly T[], pageSize: number): CursorPage<T> {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 50;
  const items = rows.slice(0, size);
  return { items, hasNext: rows.length > size, nextCursor: rows.length > size ? items[items.length - 1]?.id : undefined };
}
