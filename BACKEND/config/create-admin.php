<?php

// Connect to the database
require_once __DIR__ . "/db.php";

// Admin login details
$email = "admin@mealbridge.com";
$password = "Admin123!";

// Check if this email already exists
$sql = "SELECT id FROM users WHERE email = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$email]);

if ($stmt->fetch()) {
    exit("This email already exists. Choose another email.");
}

// Convert password into a secure hash
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Save the admin in the database
$sql = "INSERT INTO users (role, email, password, address, latitude, longitude)
        VALUES ('ADMIN', ?, ?, 'Admin HQ', 0.0, 0.0)";

$stmt = $pdo->prepare($sql);
$stmt->execute([$email, $hashedPassword]);

echo "Admin account created successfully!";

?>