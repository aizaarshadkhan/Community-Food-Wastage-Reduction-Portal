<?php
/*
 * Database Migration Script
 * Adds required columns (verification_doc, verification_status) and creates food_categories table.
 */
header("Content-Type: application/json");
require_once __DIR__ . "/../BACKEND/config/db.php";

$messages = [];

try {
    // 1. Add verification_doc to users table if not exists
    $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'verification_doc'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN verification_doc VARCHAR(255) NULL AFTER longitude");
        $messages[] = "Added verification_doc column to users table.";
    }

    // 2. Add verification_status to users table if not exists
    $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'verification_status'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING' AFTER verification_doc");
        // Existing donors and admins can be marked VERIFIED by default
        $pdo->exec("UPDATE users SET verification_status = 'VERIFIED' WHERE role IN ('DONOR', 'ADMIN')");
        $messages[] = "Added verification_status column to users table.";
    }

    // 3. Create food_categories table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS food_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(50) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    $messages[] = "Ensured food_categories table exists.";

    // Seed default categories
    $stmt = $pdo->query("SELECT COUNT(*) FROM food_categories");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO food_categories (name, code) VALUES
            ('Vegetarian', 'VEG'),
            ('Non-Vegetarian', 'NON_VEG'),
            ('Bakery & Breads', 'BAKERY'),
            ('Cooked Meals', 'COOKED'),
            ('Packaged & Dry Groceries', 'GROCERY')
        ");
        $messages[] = "Seeded default food categories.";
    }

    // 4. Modify food_listings.category to allow flexible category names
    $pdo->exec("ALTER TABLE food_listings MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT 'VEG'");
    $messages[] = "Updated food_listings category column definition.";

    echo json_encode([
        "success" => true,
        "message" => "Database schema updated successfully.",
        "details" => $messages
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Schema update failed: " . $e->getMessage()
    ]);
}
?>
