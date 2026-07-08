-- Fix coverage summary trigger: column is last_updated, not updated_at
CREATE OR REPLACE FUNCTION update_hotspot_coverage_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
