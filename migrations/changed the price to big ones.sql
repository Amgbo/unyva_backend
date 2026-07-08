BEGIN;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_price_check,
  ADD CONSTRAINT products_price_check CHECK (price >= 0);

ALTER TABLE services
  DROP CONSTRAINT IF EXISTS services_price_check,
  ADD CONSTRAINT services_price_check CHECK (price >= 0);
 
COMMIT;
