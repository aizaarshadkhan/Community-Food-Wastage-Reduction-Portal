-- ============================================================
-- COMMUNITY FOOD WASTAGE REDUCTION PORTAL
-- Database Schema: db
-- ============================================================

CREATE DATABASE IF NOT EXISTS db;
USE db;

-- 1. Users Table (Donors, Recipients/NGOs, Admin)
-- Includes verification document and status for NGOs/Donors
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('DONOR', 'RECIPIENT', 'ADMIN') NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(150) NULL,
    ngo_name VARCHAR(150) NULL,
    contact_person VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    verification_doc VARCHAR(255) NULL, -- Uploaded registration certificate / ID
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING', -- Admin verification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Food Categories Table (Managed by Admin)
CREATE TABLE IF NOT EXISTS food_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default food categories
INSERT IGNORE INTO food_categories (name, code) VALUES
('Vegetarian', 'VEG'),
('Non-Vegetarian', 'NON_VEG'),
('Bakery & Breads', 'BAKERY'),
('Cooked Meals', 'COOKED'),
('Packaged & Dry Groceries', 'GROCERY');

-- 3. Food Listings Table
CREATE TABLE IF NOT EXISTS food_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    food_title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'VEG',
    quantity DECIMAL(10,2) NOT NULL, -- Quantity in kg or servings
    image VARCHAR(255) NULL,
    pickup_address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    expiry_datetime DATETIME NOT NULL,
    status ENUM('AVAILABLE', 'CLAIMED', 'DELIVERED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
    claimed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Food Claims Table (Atomic Claim Reservation)
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

-- 5. Feedback & Quality Rating Table
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_id INT NOT NULL,
    recipient_id INT NOT NULL,
    donor_id INT NOT NULL,
    rating INT NOT NULL, -- 1 to 5 Stars
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_id) REFERENCES food_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_claim_feedback (food_id, recipient_id)
);

-- 6. Notifications Table (In-app Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_status_expiry ON food_listings(status, expiry_datetime);
CREATE INDEX IF NOT EXISTS idx_food_donor ON food_listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_food_claimed_by ON food_listings(claimed_by);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, verification_status);
