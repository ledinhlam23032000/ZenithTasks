-- Repair legacy case-service rows where the listed price was recorded but the
-- actual/final price was left at zero. This is intentionally narrow: only
-- rows with no unit price, no final price, and no discount are inferred.
UPDATE "CaseService"
SET
  "unitPrice" = "listPrice",
  "finalPrice" = "listPrice" * GREATEST("quantity", 1)
WHERE "listPrice" > 0
  AND "unitPrice" = 0
  AND "finalPrice" = 0
  AND "discount" = 0;

-- Rebuild every case snapshot from its child services/payments so dashboards,
-- debt pages, exports, and older consumers all see the same totals.
WITH service_totals AS (
  SELECT
    c.id,
    COALESCE(SUM(GREATEST(cs."unitPrice" * GREATEST(cs.quantity, 1) - cs.discount, 0)), 0) AS subtotal,
    COALESCE(SUM(GREATEST(cs.discount, 0)), 0) AS line_discount
  FROM "CaseRecord" c
  LEFT JOIN "CaseService" cs ON cs."caseId" = c.id
  GROUP BY c.id
), payment_totals AS (
  SELECT
    "caseId" AS id,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS paid
  FROM "Payment"
  GROUP BY "caseId"
), calculated AS (
  SELECT
    c.id,
    st.subtotal,
    st.line_discount,
    LEAST(GREATEST(COALESCE(c."voucherAmount", 0), 0), st.subtotal) AS voucher,
    COALESCE(pt.paid, 0) AS paid
  FROM "CaseRecord" c
  JOIN service_totals st ON st.id = c.id
  LEFT JOIN payment_totals pt ON pt.id = c.id
), totals AS (
  SELECT
    id,
    subtotal,
    line_discount,
    voucher,
    paid,
    GREATEST(subtotal - voucher, 0) AS total
  FROM calculated
)
UPDATE "CaseRecord" c
SET
  "totalAmount" = t.total,
  "discountAmount" = t.line_discount,
  "paidAmount" = t.paid,
  "debtAmount" = GREATEST(t.total - t.paid, 0)
FROM totals t
WHERE t.id = c.id;
