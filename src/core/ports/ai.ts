// One entry per column of the owner's list: the index of the matching spreadsheet column, or null.
export type ColumnMapping = (number | null)[];

export interface AIProvider {
  mapColumns(targetColumns: string[], sourceHeaders: string[], sampleRows: string[][]): Promise<ColumnMapping>;
}