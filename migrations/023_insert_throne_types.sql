-- Insert throne types into throne_types table

INSERT INTO throne_types (name, description, points_required) VALUES
('top_seller', 'Most completed deals this week (orders + deliveries + meetups)', 1),
('most_trusted_seller', 'Highest rated seller with minimum 3 reviews', 3),
('most_followed_student', 'Most new followers gained this week', 1),
('most_active_student', 'Most engagement and activity across the platform', 0)
ON CONFLICT (name) DO NOTHING;
