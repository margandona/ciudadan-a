import { describe, expect, it } from "vitest";
import {
  hasDoubleSpace,
  hasLeadingOrTrailingSpace,
  isAllCaps,
  normalizeSearchName,
  suggestNameParts,
} from "./name-rules";

describe("normalizeSearchName", () => {
  it("elimina tildes y minúsculas", () => {
    expect(normalizeSearchName("María José Muñoz Díaz")).toBe("maria jose munoz diaz");
  });

  it("conserva la Ñ (normalizada) y colapsa espacios", () => {
    expect(normalizeSearchName("  ÑAÑA   ARAÑA  ")).toBe("nana arana");
  });

  it("colapsa espacios duplicados", () => {
    expect(normalizeSearchName("Ana   Pérez")).toBe("ana perez");
  });
});

describe("detectores de anomalías", () => {
  it("detecta doble espacio", () => {
    expect(hasDoubleSpace("ANA  PEREZ")).toBe(true);
    expect(hasDoubleSpace("Ana Perez")).toBe(false);
  });

  it("detecta espacios iniciales/finales", () => {
    expect(hasLeadingOrTrailingSpace(" Ana Perez")).toBe(true);
    expect(hasLeadingOrTrailingSpace("Ana Perez ")).toBe(true);
    expect(hasLeadingOrTrailingSpace("Ana Perez")).toBe(false);
  });

  it("detecta mayúsculas completas", () => {
    expect(isAllCaps("MARIAA GONZALEZ")).toBe(true);
    expect(isAllCaps("María González")).toBe(false);
  });
});

describe("suggestNameParts", () => {
  it("reparte nombre compuesto + dos apellidos como sugerencia marcada ambigua", () => {
    const parts = suggestNameParts("María José Muñoz Díaz");
    expect(parts.firstName).toBe("María");
    expect(parts.middleName).toBe("José");
    expect(parts.paternalSurname).toBe("Muñoz");
    expect(parts.maternalSurname).toBe("Díaz");
    expect(parts.ambiguous).toBe(true);
  });

  it("dos palabras: nombre + apellido paterno, sin ambigüedad", () => {
    const parts = suggestNameParts("Ana Pérez");
    expect(parts.firstName).toBe("Ana");
    expect(parts.paternalSurname).toBe("Pérez");
    expect(parts.ambiguous).toBe(false);
  });

  it("una sola palabra: ambigua", () => {
    const parts = suggestNameParts("Rukmini");
    expect(parts.firstName).toBe("Rukmini");
    expect(parts.ambiguous).toBe(true);
  });

  it("no altera el nombre original", () => {
    const original = "María José Muñoz Díaz";
    suggestNameParts(original);
    expect(original).toBe("María José Muñoz Díaz");
  });
});
