-- Seed: Default Manager Accounts
-- CS 308 Online Ticketing Project
-- Date: 2026-03-26
-- Password: Admin1234! (bcrypt hashed with salt rounds 10)

-- Note: The actual bcrypt hash will be generated when this seed runs
-- For now, these are placeholder hashes that will be replaced by the seed script
-- The password for both accounts is: Admin1234!

INSERT INTO users (name, email, password_hash, tax_id, home_address, role)
VALUES
  ('Sales Manager', 'sales@ticketing.com', '$2b$10$XqZ5Z5Z5Z5Z5Z5Z5Z5Z5Z.placeholder_hash_will_be_generated', '11111111111', 'HQ', 'sales_manager'),
  ('Product Manager', 'product@ticketing.com', '$2b$10$XqZ5Z5Z5Z5Z5Z5Z5Z5Z5Z.placeholder_hash_will_be_generated', '22222222222', 'HQ', 'product_manager')
ON CONFLICT (email) DO NOTHING;
