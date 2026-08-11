import { describe, expect, it } from "vitest";
import { CLASS_STATUS, type ClassAvailability, type ClassSchedule } from "@pclab/shared";
import { defaultAvailability, isFlippedAvailable, resolveStudentVisibility, validateScheduleInput } from "./availability";

function schedule(status: ClassSchedule["status"], availability: Partial<ClassAvailability>): ClassSchedule {
  return {
    classId: "class-01",
    courseId: "course-x",
    status,
    availability: { ...defaultAvailability(), ...availability },
    updatedAt: "2026-08-10T10:00:00.000Z",
    updatedBy: "t",
  };
}

describe("resolveStudentVisibility", () => {
  it("oculta DRAFT y ARCHIVED", () => {
    expect(resolveStudentVisibility(schedule(CLASS_STATUS.DRAFT, {}), "2026-08-10T12:00:00.000Z")).toBe("hidden");
    expect(resolveStudentVisibility(schedule(CLASS_STATUS.ARCHIVED, {}), "2026-08-10T12:00:00.000Z")).toBe("hidden");
  });

  it("muestra COMPLETED como 'done'", () => {
    expect(resolveStudentVisibility(schedule(CLASS_STATUS.COMPLETED, {}), "2026-08-10T12:00:00.000Z")).toBe("done");
  });

  it("abre READY sin ventana", () => {
    expect(resolveStudentVisibility(schedule(CLASS_STATUS.READY, {}), "2026-08-10T12:00:00.000Z")).toBe("open");
  });

  it("bloquea SCHEDULED antes de startAt y abre después", () => {
    const s = schedule(CLASS_STATUS.SCHEDULED, { startAt: "2026-08-12T10:00:00.000Z" });
    expect(resolveStudentVisibility(s, "2026-08-11T10:00:00.000Z")).toBe("locked");
    expect(resolveStudentVisibility(s, "2026-08-13T10:00:00.000Z")).toBe("open");
  });

  it("oculta después de endAt", () => {
    const s = schedule(CLASS_STATUS.OPEN, { endAt: "2026-08-12T10:00:00.000Z" });
    expect(resolveStudentVisibility(s, "2026-08-13T10:00:00.000Z")).toBe("hidden");
  });

  it("oculta si enabled=false", () => {
    expect(resolveStudentVisibility(schedule(CLASS_STATUS.OPEN, { enabled: false }), "2026-08-10T12:00:00.000Z")).toBe("hidden");
  });

  it("oculta sin horario (null)", () => {
    expect(resolveStudentVisibility(null, "2026-08-10T12:00:00.000Z")).toBe("hidden");
  });
});

describe("isFlippedAvailable", () => {
  it("solo cuando flippedAvailable y estado permitido", () => {
    expect(isFlippedAvailable(schedule(CLASS_STATUS.OPEN, {}), "2026-08-10T12:00:00.000Z")).toBe(true);
    expect(isFlippedAvailable(schedule(CLASS_STATUS.OPEN, { flippedAvailable: false }), "2026-08-10T12:00:00.000Z")).toBe(false);
    expect(isFlippedAvailable(schedule(CLASS_STATUS.DRAFT, {}), "2026-08-10T12:00:00.000Z")).toBe(false);
    expect(isFlippedAvailable(schedule(CLASS_STATUS.SCHEDULED, { startAt: "2026-08-12T10:00:00.000Z" }), "2026-08-11T10:00:00.000Z")).toBe(false);
  });
});

describe("validateScheduleInput", () => {
  it("rechaza estado inválido", () => {
    expect(() => validateScheduleInput({ status: "HACKED" })).toThrow();
  });

  it("rechaza ventana invertida", () => {
    expect(() =>
      validateScheduleInput({
        availability: { startAt: "2026-08-13T10:00:00.000Z", endAt: "2026-08-12T10:00:00.000Z" },
      }),
    ).toThrow();
  });
});
