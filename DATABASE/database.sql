CREATE DATABASE IF NOT EXISTS db;
USE db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('DONOR', 'RECIPIENT', 'ADMIN') NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(150),
    ngo_name VARCHAR(150),
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    food_title VARCHAR(200) NOT NULL,
    category ENUM('VEG', 'NON_VEG') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    image VARCHAR(255) NULL,
    pickup_address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    expiry_datetime DATETIME NOT NULL,
    status ENUM('AVAILABLE', 'CLAIMED', 'DELIVERED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
    claimed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id),
    FOREIGN KEY (claimed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS food_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_id INT NOT NULL,
    recipient_id INT NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (food_id) REFERENCES food_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (food_id)
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_id INT NOT NULL,
    recipient_id INT NOT NULL,
    donor_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_id) REFERENCES food_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_claim_feedback (food_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_food_status_expiry
ON food_listings(status, expiry_datetime);

CREATE INDEX idx_food_donor
ON food_listings(donor_id);

CREATE INDEX idx_food_claimed_by
ON food_listings(claimed_by);
