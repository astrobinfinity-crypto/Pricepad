// What the app needs from ANY AI provider. Gemini, Qwen, etc. must follow this.
export type ColumnMapping = {
  item: string | null;
  unit: string | null;
  mrp: string | null;
  price: string | null;
};

export interface AIProvider {
  /** Given the headers and a few sample rows of an Excel sheet, guess which column is which. */
  mapColumns(headers: string[], sampleRows: string[][]): Promise<ColumnMapping>;
}