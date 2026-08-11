import { describe, expect, it } from "vitest";
import { CALENDAR_STATUS } from "@pclab/shared";
import { calendarStatus, daysLeft, percent } from "./dashboard";

const NOW = "2026-08-10T12:00:00.000Z";

describe("percent", () => {
  it("calcula porcentaje redondeado", () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(0, 4)).toBe(0);
    expect(percent(5, 0)).toBe(0);
  });
});

describe("daysLeft", () => {
  it("días entre fechas", () => {
    expect(daysLeft("2026-08-13T12:00:00.000Z", NOW)).toBe(3);
    expect(daysLeft("2026-08-07T12:00:00.000Z", NOW)).toBe(-3);
  });
});

describe("calendarStatus", () => {
  it("verde cuando hay margen, amarillo cerca, rojo vencido", () => {
    expect(calendarStatus("2026-08-20T12:00:00.000Z", NOW, 3).status).toBe(CALENDAR_STATUS.GREEN);
    expect(calendarStatus("2026-08-12T12:00:00.000Z", NOW, 3).status).toBe(CALENDAR_STATUS.YELLOW);
    expect(calendarStatus("2026-08-09T12:00:00.000Z", NOW, 3).status).toBe(CALENDAR_STATUS.RED);
  });

  it("devuelve días restantes", () => {
    expect(calendarStatus("2026-08-12T12:00:00.000Z", NOW, 3).daysLeft).toBe(2);
  });
});
