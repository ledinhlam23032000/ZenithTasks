import { describe, expect, it } from "vitest";
import { CONSULTATION_SCREENING_ITEMS, consultationPrintDocument, defaultScreening, normalizeScreening, renderConsultationHtml } from "../consultation-sheet";

describe("consultation sheet", () => {
  it("defaults every medical screening item to normal", () => {
    const screening = defaultScreening();
    expect(Object.keys(screening)).toHaveLength(CONSULTATION_SCREENING_ITEMS.length);
    expect(Object.values(screening).every((entry) => entry.abnormal === false && entry.note === "")).toBe(true);
  });

  it("keeps compatibility with old boolean screening data", () => {
    const screening = normalizeScreening({ "Tiểu đường": true, "Tim mạch": false });
    expect(screening["Tiểu đường"]).toEqual({ abnormal: true, note: "" });
    expect(screening["Tim mạch"]).toEqual({ abnormal: false, note: "" });
  });

  it("auto-fills the consultation sheet and renders editable print content", () => {
    const document = consultationPrintDocument({
      code: "HS000123",
      createdAt: new Date("2026-08-21T03:00:00Z"),
      customer: { fullName: "Nguyễn Thị A", code: "KH000123", phoneLast5: "12345", gender: "FEMALE", dob: new Date("1990-08-21"), address: "Hải Phòng" },
      consultation: {
        weightKg: 55,
        heightCm: 165,
        bloodType: "O",
        emergencyName: "Nguyễn Văn B",
        emergencyPhone: "0987654321",
        pulse: 70,
        bloodPressure: "120/80",
        temperatureC: 36.5,
        respiratoryRate: 18,
        spo2: 99,
        screening: { "Dị ứng thuốc": { abnormal: true, note: "Dị ứng penicillin" } },
        patientConfirmed: false,
        wants: "Nâng mũi",
        currentCondition: "Sống mũi thấp",
        expectedResult: "Tự nhiên",
        doctorIndication: "Khám và tư vấn trực tiếp",
        serviceSnapshot: null,
        printOverrides: { fullName: "Nguyễn Thị A đã rà soát", extraNote: "Bổ sung khi in" },
      },
      consultant: { fullName: "Nhân viên tư vấn" },
      doctor: { fullName: "Bác sĩ" },
      services: [{ name: "Tư vấn nâng mũi", quantity: 1, finalPrice: 0 }],
    });
    expect(document.fullName).toBe("Nguyễn Thị A đã rà soát");
    expect(document.phoneLast5).toBe("12345");
    expect(document.screening.find((item) => item.label.startsWith("Dị ứng thuốc"))).toMatchObject({ abnormal: true, note: "Dị ứng penicillin" });
    expect(renderConsultationHtml(document)).toContain("PHIẾU TƯ VẤN DỊCH VỤ THẨM MỸ");
    expect(renderConsultationHtml(document)).toContain("Bổ sung khi in");
  });
});
