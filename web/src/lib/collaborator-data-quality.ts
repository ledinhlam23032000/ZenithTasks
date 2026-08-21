export type CollaboratorQualityRow = {
  id: string | null;
  name: string;
  registered: boolean;
};

export type CollaboratorQualitySummary = {
  total: number;
  missingId: number;
  unregistered: number;
  healthy: number;
};

export function summarizeCollaboratorQuality(rows: readonly CollaboratorQualityRow[]): CollaboratorQualitySummary {
  const missingId = rows.filter((row) => !row.id).length;
  const unregistered = rows.filter((row) => Boolean(row.id) && !row.registered).length;
  return { total: rows.length, missingId, unregistered, healthy: rows.length - missingId - unregistered };
}
