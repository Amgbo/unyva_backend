-- Fix purchase_history trigger - change NEW.price to NEW.unit_price
DROP TRIGGER IF EXISTS trigger_populate_purchase_history ON orders;
DROP FUNCTION IF EXISTS populate_purchase_history();

CREATE OR REPLACE FUNCTION populate_purchase_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if the order is confirmed/delivered
    IF NEW.status IN ('confirmed', 'delivered') THEN
        INSERT INTO purchase_history (student_id, product_id, order_id, quantity, price_at_purchase, purchased_at)
        VALUES (NEW.customer_id, NEW.product_id, NEW.id, NEW.quantity, NEW.unit_price, NEW.created_at)
        ON CONFLICT DO NOTHING; -- Prevent duplicates
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_purchase_history
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION populate_purchase_history();
