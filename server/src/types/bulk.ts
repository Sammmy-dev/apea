/** Per-row result of a bulk (CSV) create operation. */
export interface BulkResult<T> {
  /** 1-based line number in the original CSV (header = line 1). */
  row: number;
  status: 'ok' | 'error';
  data?: T;
  error?: string;
}

export interface BulkSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkResult<unknown>[];
}