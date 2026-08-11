import * as XLSX from "xlsx";

export type RosterRow = (string | number)[];

/** Genera un buffer XLSX con la estructura real de las nóminas (banner + cabecera). */
export function makeRosterBuffer(courseBanner: string, rows: RosterRow[]): Uint8Array {
  const aoa: (string | number)[][] = [
    ["COLEGIO LA PROVIDENCIA"],
    [courseBanner],
    ["Educación Ciudadana"],
    [],
    ["Nº", "Nombre completo", "RUN", "Estado"],
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Worksheet");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}

/** Filas DEMO ficticias (nunca usar nombres reales en tests). */
export const demoRosterD = (): RosterRow[] => [
  [1, "Ana Demo Uno", "11111111-1", "Matriculado"],
  [2, "Beatriz Demo Dos", "22222222-2", "Matriculado"],
  [3, "Carolina Demo Tres", "33333333-3", "Matriculado"],
  [4, "Daniela Demo Cuatro", "44444444-4", "Retirado"],
];

export const demoRosterE = (): RosterRow[] => [
  [1, "Ernestina Demo Cinco", "55555555-5", "Matriculado"],
  [2, "Francisca Demo Seis", "66666666-6", "Matriculado"],
];
