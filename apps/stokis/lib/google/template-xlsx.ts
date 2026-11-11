// lib/google/template-xlsx.ts
// Re-export untuk backward compatibility. Seluruh implementasi pembuatan berkas
// XLSX telah dikonsolidasi secara permanen ke generator in-memory: lib/domain/xlsx-report.ts.

export { generateXlsxReport as generateXlsxFromTemplate } from '@/lib/domain/xlsx-report';
export type { XlsxItem, XlsxReportInput } from '@/lib/domain/xlsx-report';
