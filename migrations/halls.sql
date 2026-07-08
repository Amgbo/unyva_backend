-- Insert University of Ghana halls data
INSERT INTO university_halls (full_name, short_name, location_zone) VALUES
('Commonwealth Hall', 'Commey', 'Main Campus'),
('Legon Hall', 'Legon', 'Main Campus'),
('Volta Hall', 'Volta', 'Main Campus'),
('Akuafo Hall', 'Akuafo', 'Main Campus'),
('Mensah Sarbah Hall', 'Sarbah', 'Main Campus'),
('Jean Nelson Aka Hall', 'JNA', 'Main Campus'),
('Elizabeth Sey Hall', 'E-Sey', 'Main Campus'),
('Hilla Limann Hall', 'Limann', 'Main Campus'),
('Alexander Kwapong Hall', 'Kwapong', 'Main Campus'),
('James Topp Nelson Yankah Hall', 'JTNY', 'Main Campus'),
('Bani Hall', 'Bani', 'Main Campus'),
('Africa Hall', 'Africa', 'Main Campus'),
('International Students Hostel', 'ISH', 'Main Campus'),
('Valco Trust Hostel', 'Valco', 'Main Campus'),
('Off-Campus', 'Off-Campus', 'Off-Campus')
ON CONFLICT (full_name) DO NOTHING;


