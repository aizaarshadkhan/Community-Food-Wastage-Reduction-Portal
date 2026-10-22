<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    // Automatically update any past-due available listings to EXPIRED in the database
    $pdo->exec("UPDATE food_listings SET status = 'EXPIRED' WHERE status = 'AVAILABLE' AND expiry_datetime <= NOW()");

    // Basic stats
    $statsStmt = $pdo->query("
        SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'DONOR') AS total_donors,
            (SELECT COUNT(*) FROM users WHERE role = 'RECIPIENT') AS total_recipients,
            (SELECT COUNT(*) FROM food_listings) AS total_listings,
            (SELECT COUNT(*) FROM food_listings WHERE status = 'AVAILABLE' AND expiry_datetime > NOW()) AS active_listings,
            (SELECT COUNT(*) FROM food_listings WHERE status = 'DELIVERED') AS total_delivered,
            (SELECT COUNT(*) FROM food_claims) AS total_claims
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // All registered users
    $usersStmt = $pdo->query("
        SELECT id, role, email, business_name, ngo_name, contact_person, phone, address, created_at
        FROM users
        ORDER BY id DESC
    ");
    $users = $usersStmt->fetchAll(PDO::FETCH_ASSOC);

    // All food listings with donor and recipient info
    $listingsStmt = $pdo->query("
        SELECT 
            f.id,
            f.food_title,
            f.category,
            f.quantity,
            f.image,
            f.pickup_address,
            f.expiry_datetime,
            CASE 
                WHEN f.status = 'AVAILABLE' AND f.expiry_datetime <= NOW() THEN 'EXPIRED'
                ELSE f.status 
            END AS status,
            f.created_at,
            donor.email AS donor_email,
            donor.business_name AS donor_name,
            recipient.email AS recipient_email,
            recipient.ngo_name AS recipient_name
        FROM food_listings f
        LEFT JOIN users donor ON f.donor_id = donor.id
        LEFT JOIN users recipient ON f.claimed_by = recipient.id
        ORDER BY f.id DESC
    ");
    $listings = $listingsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "stats" => $stats,
        "users" => $users,
        "listings" => $listings
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
