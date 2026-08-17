ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive" CHECK (amount > 0);

ALTER TABLE "CaseService"
ADD CONSTRAINT "CaseService_price_nonnegative" CHECK (
  "listPrice" >= 0 AND "unitPrice" >= 0 AND quantity >= 1 AND discount >= 0 AND "finalPrice" >= 0
);

ALTER TABLE "MaterialUsage"
ADD CONSTRAINT "MaterialUsage_quantity_positive" CHECK (quantity > 0);

ALTER TABLE "Material"
ADD CONSTRAINT "Material_stock_nonnegative" CHECK (stock >= 0);
