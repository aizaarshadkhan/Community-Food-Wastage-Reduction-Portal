<?php
/**
 * donor-food.php - Donor Dashboard Data API
 * 
 * Requirements Handled:
 * - Donor Dashboard: Summary of total food donated, impact metrics ("150 meals saved"), and current active listings.
 * - Auto-expiration: Automatically marks past-due available food as EXPIRED.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    // 1. Validate Donor ID
    $donorId = $_GET["donor_id"] ?? null;
    if (!$donorId || (int)$donorId <= 0) {
        echo json_encode(["success" => false, "message" => "Valid Donor ID is required."]);
        exit;
    }
    $donorId = (int)$donorId;

    // 2. Automatically mark expired listings
    $pdo->exec("UPDATE food_listings SET status = 'EXPIRED' WHERE status = 'AVAILABLE' AND expiry_datetime <= NOW()");

    // 3. Aggregate Listing Status Counts
    $statsSql = "
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'AVAILABLE' AND expiry_datetime > NOW() THEN 1 ELSE 0 END), 0) AS available,
            COALESCE(SUM(CASE WHEN status = 'AVAILABLE' AND expiry_datetime <= NOW() THEN 1 ELSE 0 END), 0) AS expired,
            COALESCE(SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END), 0) AS claimed,
            COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS delivered,
            COALESCE(SUM(quantity), 0) AS total_kg_donated,
            COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN quantity ELSE 0 END), 0) AS delivered_kg
        FROM food_listings
        WHERE donor_id = :donor_id
    ";
    $statsStmt = $pdo->prepare($statsSql);
    $statsStmt->execute([":donor_id" => $donorId]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // 4. Compute Environmental & Social Impact Metrics (1 meal ≈ 0.4 kg; 1 kg food waste ≈ 2.5 kg CO2)
    $totalKg = (float)($stats["total_kg_donated"] ?? 0);
    $deliveredKg = (float)($stats["delivered_kg"] ?? 0);
    $mealsSaved = (int)round($totalKg > 0 ? ($totalKg / 0.4) : ($stats["delivered"] * 5));
    $wasteDiverted = round($totalKg, 1);
    $co2Saved = round($totalKg * 2.5, 1);

    // 5. Fetch Recent Food Listings for this Donor
    $foodSql = "
        SELECT
            f.id,
            f.food_title,
            f.category,
            f.quantity,
            f.image,
            f.pickup_address,
            f.latitude,
            f.longitude,
            f.expiry_datetime,
            CASE
                WHEN f.status = 'AVAILABLE' AND f.expiry_datetime <= NOW() THEN 'EXPIRED'
                ELSE f.status
            END AS status,
            f.claimed_by,
            f.created_at,
            u.ngo_name AS ngo_name,
            u.contact_person AS contact_person,
            u.phone AS recipient_phone,
            u.address AS recipient_address,
            fb.rating AS feedback_rating,
            fb.comment AS feedback_comment
        FROM food_listings f
        LEFT JOIN users u ON f.claimed_by = u.id AND u.role = 'RECIPIENT'
        LEFT JOIN feedback fb ON fb.food_id = f.id
        WHERE f.donor_id = :donor_id
        ORDER BY f.created_at DESC
    ";
    $foodStmt = $pdo->prepare($foodSql);
    $foodStmt->execute([":donor_id" => $donorId]);
    $foodListings = $foodStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Return Structured Response
    echo json_encode([
        "success" => true,
        "stats" => [
            "total" => (int)($stats["total"] ?? 0),
            "available" => (int)($stats["available"] ?? 0),
            "expired" => (int)($stats["expired"] ?? 0),
            "claimed" => (int)($stats["claimed"] ?? 0),
            "delivered" => (int)($stats["delivered"] ?? 0)
        ],
        "impact" => [
            "meals_saved" => $mealsSaved,
            "waste_diverted_kg" => $wasteDiverted,
            "co2_saved_kg" => $co2Saved
        ],
        "food" => $foodListings
    ]);

} catch (PDOException $e) {
    error_log("donor-food error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Unable to load donor food listings."
    ]);
}
?>
