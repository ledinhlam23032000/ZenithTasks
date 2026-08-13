-- Normalize legacy service lines first. Older imports sometimes kept only a
-- list/final price, leaving unitPrice/finalPrice at zero. Canonicalizing the
-- line makes direct aggregates (reports/AI) agree with the shared calculator.
UPDATE "CaseService"
SET
  quantity = GREATEST(COALESCE(quantity, 1), 1),
  "listPrice" = GREATEST(COALESCE("listPrice", 0), 0),
  "unitPrice" = CASE
    WHEN COALESCE("unitPrice", 0) > 0 THEN "unitPrice"
    WHEN COALESCE("finalPrice", 0) > 0 THEN "finalPrice" + GREATEST(COALESCE(discount, 0), 0)
    ELSE GREATEST(COALESCE("listPrice", 0), 0)
  END,
  discount = GREATEST(COALESCE(discount, 0), 0),
  "finalPrice" = CASE
    WHEN COALESCE("unitPrice", 0) > 0 THEN GREATEST("unitPrice" * GREATEST(COALESCE(quantity, 1), 1) - GREATEST(COALESCE(discount, 0), 0), 0)
    WHEN COALESCE("finalPrice", 0) > 0 THEN GREATEST("finalPrice", 0)
    ELSE GREATEST(GREATEST(COALESCE("listPrice", 0), 0) * GREATEST(COALESCE(quantity, 1), 1) - GREATEST(COALESCE(discount, 0), 0), 0)
  END;

UPDATE "CaseRecord"
SET "voucherAmount" = GREATEST(COALESCE("voucherAmount", 0), 0)
WHERE "voucherAmount" < 0;

-- Rebuild every CaseRecord financial snapshot using the same fallback order as
-- web/src/lib/financial-summary.ts. This repairs imported rows where only
-- listPrice or finalPrice was preserved and prevents reports from showing a
-- stale snapshot after a legacy import.
WITH service_lines AS (
  SELECT
    c.id AS case_id,
    COALESCE(SUM(
      CASE
        WHEN cs."unitPrice" > 0 THEN GREATEST(cs."unitPrice" * GREATEST(cs.quantity, 1) - cs.discount, 0)
        WHEN cs."finalPrice" > 0 THEN GREATEST(cs."finalPrice", 0)
        ELSE GREATEST(cs."listPrice" * GREATEST(cs.quantity, 1) - cs.discount, 0)
      END
    ), 0) AS subtotal,
    COALESCE(SUM(GREATEST(cs.discount, 0)), 0) AS line_discount
  FROM "CaseRecord" c
  LEFT JOIN "CaseService" cs ON cs."caseId" = c.id
  GROUP BY c.id
), payment_lines AS (
  SELECT
    "caseId" AS case_id,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS paid
  FROM "Payment"
  GROUP BY "caseId"
), totals AS (
  SELECT
    c.id,
    sl.subtotal,
    sl.line_discount,
    LEAST(GREATEST(COALESCE(c."voucherAmount", 0), 0), sl.subtotal) AS voucher,
    COALESCE(pl.paid, 0) AS paid
  FROM "CaseRecord" c
  JOIN service_lines sl ON sl.case_id = c.id
  LEFT JOIN payment_lines pl ON pl.case_id = c.id
)
UPDATE "CaseRecord" c
SET
  "totalAmount" = GREATEST(t.subtotal - t.voucher, 0),
  "discountAmount" = t.line_discount,
  "paidAmount" = t.paid,
  "debtAmount" = GREATEST(GREATEST(t.subtotal - t.voucher, 0) - t.paid, 0)
FROM totals t
WHERE t.id = c.id;
