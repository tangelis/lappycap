import type { ParsedPreset } from "../presets/interfaces";

export interface ImportDiagnostic {
  code: "UNSUPPORTED_FEATURE" | "MALFORMED_SOURCE";
  message: string;
}

export interface ImportResult {
  preset: ParsedPreset;
  diagnostics: ImportDiagnostic[];
}

export interface ProjectMImportAdapter {
  importToLappycap(source: string): ImportResult;
}
