import { describe, it, expect } from "vitest";
import { collectionsByStaff, collectionsTotal, type PaymentAttribution } from "../collections";

const T7 = new Date(2026, 6, 1); // đầu kỳ: 01/07/2026

function pay(over: Partial<PaymentAttribution>): PaymentAttribution {
  return {
    amount: 1_000_000,
    paidAt: new Date(2026, 6, 10),
    caseCreatedAt: new Date(2026, 6, 5),
    consultantId: "tv1",
    doctorId: "bs1",
    ...over,
  };
}

describe("collectionsByStaff", () => {
  it("khoản thu từ ca tạo trong kỳ tính là 'ca mới'", () => {
    const { consultants, doctors } = collectionsByStaff([pay({})], T7);
    expect(consultants.get("tv1")).toEqual({ total: 1_000_000, fromNew: 1_000_000, fromDebt: 0 });
    expect(doctors.get("bs1")).toEqual({ total: 1_000_000, fromNew: 1_000_000, fromDebt: 0 });
  });

  it("khoản thu từ ca tạo TRƯỚC kỳ tính là 'thu nợ ca cũ' — đúng nghiệp vụ trả nợ tháng sau", () => {
    const { consultants } = collectionsByStaff(
      [pay({ caseCreatedAt: new Date(2026, 5, 20), amount: 10_000_000 })], // ca chốt tháng 6, thu tháng 7
      T7,
    );
    expect(consultants.get("tv1")).toEqual({ total: 10_000_000, fromNew: 0, fromDebt: 10_000_000 });
  });

  it("cùng 1 khoản tiền ghi cho CẢ tư vấn viên và bác sĩ, không cộng gộp lẫn nhau", () => {
    const { consultants, doctors } = collectionsByStaff([pay({ amount: 5_000_000 })], T7);
    expect(consultants.get("tv1")?.total).toBe(5_000_000);
    expect(doctors.get("bs1")?.total).toBe(5_000_000);
  });

  it("hồ sơ thiếu tư vấn viên / bác sĩ thì chỉ ghi cho bên còn lại", () => {
    const { consultants, doctors } = collectionsByStaff([pay({ doctorId: null })], T7);
    expect(consultants.get("tv1")?.total).toBe(1_000_000);
    expect(doctors.size).toBe(0);
  });

  it("cộng dồn nhiều khoản, tách đúng mới/nợ", () => {
    const { consultants } = collectionsByStaff(
      [
        pay({ amount: 2_000_000 }),
        pay({ amount: 3_000_000, caseCreatedAt: new Date(2026, 4, 1) }),
        pay({ amount: 500_000, consultantId: "tv2" }),
      ],
      T7,
    );
    expect(consultants.get("tv1")).toEqual({ total: 5_000_000, fromNew: 2_000_000, fromDebt: 3_000_000 });
    expect(consultants.get("tv2")?.total).toBe(500_000);
  });

  it("bỏ qua khoản 0/âm", () => {
    const { consultants } = collectionsByStaff([pay({ amount: 0 }), pay({ amount: -5 })], T7);
    expect(consultants.size).toBe(0);
  });
});

describe("collectionsTotal", () => {
  it("đếm mỗi khoản đúng 1 lần dù có cả tư vấn viên lẫn bác sĩ", () => {
    const total = collectionsTotal([pay({ amount: 4_000_000 }), pay({ amount: 6_000_000, caseCreatedAt: new Date(2026, 0, 1) })], T7);
    expect(total).toEqual({ total: 10_000_000, fromNew: 4_000_000, fromDebt: 6_000_000 });
  });
});
