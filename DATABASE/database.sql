-- CREATE DATABASE db;
-- USE db;

-- CREATE TABLE users (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     role ENUM('DONOR', 'RECIPIENT') NOT NULL,
--     email VARCHAR(150) NOT NULL UNIQUE,
--     password VARCHAR(255) NOT NULL,
--     business_name VARCHAR(150),
--     ngo_name VARCHAR(150),
--     contact_person VARCHAR(150),
--     phone VARCHAR(30),
--     longitude DECIMAL(11, 8) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE food_listings (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     donor_id INT NOT NULL,
--     food_title VARCHAR(200) NOT NULL,
--     category ENUM('VEG', 'NON_VEG') NOT NULL,
--     quantity DECIMAL(10,2) NOT NULL,
--     pickup_address VARCHAR(255) NOT NULL,
--     latitude DECIMAL(10, 8) NOT NULL,
--     longitude DECIMAL(11, 8) NOT NULL,
--     expiry_datetime DATETIME NOT NULL,
--     status ENUM('AVAILABLE', 'CLAIMED', 'DELIVERED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
--     claimed_by INT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (donor_id) REFERENCES users(id), FOREIGN KEY (claimed_by) REFERENCES users(id)
-- );

-- CREATE TABLE food_claims (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     food_id INT NOT NULL,
--     recipient_id INT NOT NULL,
--     claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     delivered_at TIMESTAMP NULL, FOREIGN KEY (food_id) REFERENCES food_listings(id), FOREIGN KEY (recipient_id) REFERENCES users(id),
--     UNIQUE (food_id)
-- );

-- CREATE INDEX idx_food_status_expiry
-- ON food_listings(status, expiry_datetime);
-- CREATE INDEX idx_food_donor
-- ON food_listings(donor_id);
-- CREATE INDEX idx_food_claimed_by
-- ON food_listings(claimed_by);

-- Aa!123 (password)

-- SELECT * FROM users;
-- SELECT * FROM food_listings;
-- SELECT * FROM food_claims;