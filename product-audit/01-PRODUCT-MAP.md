# Product map

## Product shape

ZenithTasks is an internal clinic/aesthetic-surgery operations system rather than a small CRUD tool. The observed architecture is Next.js 16, React, Prisma, PostgreSQL, JWT session auth, server actions, public booking, a bearer-token customer portal, media uploads, and integrations for Zalo/Facebook.

## Main capability areas

| Area | Representative routes | Core business object |
|---|---|---|
| Daily operations | `/dashboard`, `/viec-hom-nay`, `/dau-ca`, `/cham-cong` | tasks, shifts, attendance |
| Acquisition and reception | `/khach-tham-khao`, `/tiep-nhan`, `/lich-hen` | leads, appointments, customers |
| Clinical record | `/khach-hang`, `/ho-so`, `/cham-soc` | customer, case, services, photos, follow-up |
| Money | `/cong-no`, `/thu-chi`, `/ke-toan`, `/luong` | payments, debt, payroll, cash |
| Inventory | `/danh-muc`, `/kho` | materials, BOM, movement, usage |
| Management | `/bao-cao`, `/phan-tich`, `/hieu-suat`, `/ke-hoach` | reports, KPI, plans |
| People and governance | `/nhan-su`, `/nhat-ky`, `/he-thong`, `/tai-khoan` | users, audit, settings |
| Customer-facing | `/dat-lich`, `/khach/[token]` | booking, portal, NPS |
| Messaging | `/cham-soc/hop-thu`, `/cham-soc/ket-noi`, webhook routes | conversations, channels |

## Roles

The permission model contains ADMIN, MANAGER, TELESALE, RECEPTION, CONSULTANT, DOCTOR, NURSE, CARE, and SHAREHOLDER. Menu visibility and capability checks are separate. The source includes capabilities such as `case.clinical`, `payment.add`, `payment.manage`, and `phone.full`, plus module and custom grant/deny logic.

The critical audit principle is that a hidden menu is not a security boundary. Server actions and file routes need their own object-level authorization.

## Cross-module workflows

1. Public booking → lead/appointment → telesale/reception → customer.
2. Customer → case → consultation → service and price → payment/debt.
3. Case service → BOM → material usage → stock movement.
4. Case → photos/documents → clinical follow-up → customer care.
5. Customer portal → appointment confirmation/reschedule request → care follow-up/NPS.
6. Customer/case/payment → reports, commissions, accounting, and audit log.

## Highest-risk boundaries

- `caseId` / child record IDs in server actions.
- Customer health fields versus front-desk and telesale permissions.
- Authenticated media access versus patient photos/documents.
- Stock movement reversal when a case or service changes.
- Portal bearer tokens that expose treatment and financial history.
- Internal Hồng Phúc branding/configuration versus a future multi-clinic product.

