<?php
/**
 * get-admin-data.php - Admin Portal Aggregation API
 * 
 * Requirements Handled:
 * 1. Admin Reports & Graphical Analytics:
 *    - City-wise donation trends
 *    - Category breakdown
 *    - Social impact metrics: total waste reduced (kg), meals saved, number of people fed.
 * 2. User & Verification Management:
 *    - Returns registered Donors and Recipients with verification_doc and verification_status.
 * 3. Food Listings & Category Management:
 *    - Returns all food records and food categories.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    // 1. Auto-expire any active food listings whose deadline has passed
    $pdo->exec("UPDATE food_listings SET status = 'EXPIRED' WHERE status = 'AVAILABLE' AND expiry_datetime <= NOW()");

    // 2. High-Level Summary Statistics
    $statsStmt = $pdo->query("
        SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'DONOR') AS total_donors,
            (SELECT COUNT(*) FROM users WHERE role = 'RECIPIENT') AS total_recipients,
            (SELECT COUNT(*) FROM users WHERE role = 'RECIPIENT' AND verification_status = 'PENDING') AS pending_verifications,
            (SELECT COUNT(*) FROM food_listings) AS total_listings,
            (SELECT COUNT(*) FROM food_listings WHERE status = 'AVAILABLE' AND expiry_datetime > NOW()) AS active_listings,
            (SELECT COUNT(*) FROM food_listings WHERE status = 'DELIVERED') AS total_delivered,
            (SELECT COUNT(*) FROM food_claims) AS total_claims,
            (SELECT COALESCE(SUM(quantity), 0) FROM food_listings WHERE status = 'DELIVERED') AS total_waste_reduced_kg
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    $wasteReducedKg = (float)($stats["total_waste_reduced_kg"] ?? 0);
    // 1 meal ≈ 0.4 kg of food; people fed ≈ meals saved
    $mealsSaved = (int)round($wasteReducedKg > 0 ? ($wasteReducedKg / 0.4) : ($stats["total_delivered"] * 5));
    $peopleFed = $mealsSaved;

    $stats["meals_saved"] = $mealsSaved;
    $stats["people_fed"] = $peopleFed;
    $stats["total_waste_reduced_kg"] = round($wasteReducedKg, 1);

    // 3. Graphical Analytics: Category Breakdown
    $catStmt = $pdo->query("
        SELECT category, COUNT(*) AS count
        FROM food_listings
        GROUP BY category
        ORDER BY count DESC
    ");
    $categoryTrends = $catStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Graphical Analytics: City-wise Donation Trends
    // Extract primary city/district token from pickup_address (e.g. after comma or whole string)
    $cityStmt = $pdo->query("
        SELECT 
            TRIM(SUBSTRING_INDEX(pickup_address, ',', -1)) AS city_name,
            COUNT(*) AS count
        FROM food_listings
        WHERE pickup_address IS NOT NULL AND pickup_address != ''
        GROUP BY city_name
        ORDER BY count DESC
        LIMIT 7
    ");
    $cityTrends = $cityStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Registered Users with Verification Info (PDF/Doc + Status)
    $usersStmt = $pdo->query("
        SELECT 
            id, role, email, business_name, ngo_name, contact_person,
            phone, address, verification_doc, verification_status, created_at
        FROM users
        ORDER BY id DESC
    ");
    $users = $usersStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. All Food Listings with Donor and Recipient Info
    $listingsStmt = $pdo->query("
        SELECT 
            f.id,
            f.food_title,
            f.category,
            f.quantity,
            f.image,
            f.pickup_address,
            f.expiry_datetime,
            f.status,
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

    // 7. Food Categories (Managed by Admin)
    $categoriesStmt = $pdo->query("
        SELECT id, name, code, created_at 
        FROM food_categories 
        ORDER BY id ASC
    ");
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Return Complete Admin Payload
    echo json_encode([
        "success" => true,
        "stats" => $stats,
        "analytics" => [
            "categories" => $categoryTrends,
            "cities" => $cityTrends
        ],
        "categories" => $categories,
        "users" => $users,
        "listings" => $listings
    ]);

} catch (PDOException $e) {
    error_log("get-admin-data error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
