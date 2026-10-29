<?php
/**
 * available-food.php - API to search and retrieve nearby available food listings
 * Uses the Haversine formula to calculate geographic distance between recipient and food listings.
 * 
 * Requirements Handled:
 * - Interactive Map / Search: Filter food by distance/radius and location.
 * - User Management: Returns recipient's verification_status.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    // 1. Validate Recipient ID
    $recipientId = $_GET["recipient_id"] ?? null;
    if (!$recipientId || (int)$recipientId <= 0) {
        echo json_encode(["success" => false, "message" => "Valid Recipient ID is required."]);
        exit;
    }
    $recipientId = (int)$recipientId;

    // 2. Validate Radius (Default 10 km, allows 5, 10, 25, 50 km)
    $radius = isset($_GET["radius"]) ? (float)$_GET["radius"] : 10.0;
    if ($radius <= 0 || $radius > 100) {
        $radius = 10.0;
    }

    // 3. Retrieve Recipient's Profile & Location Coordinates
    $userStmt = $pdo->prepare("
        SELECT id, role, ngo_name, latitude, longitude, verification_status
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $userStmt->execute([$recipientId]);
    $recipient = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient || strtoupper(trim($recipient["role"])) !== "RECIPIENT") {
        echo json_encode(["success" => false, "message" => "Recipient organization not found."]);
        exit;
    }

    // Check if recipient has pinned their GPS location
    if ($recipient["latitude"] === null || $recipient["longitude"] === null || $recipient["latitude"] === "" || $recipient["longitude"] === "") {
        echo json_encode([
            "success" => false,
            "message" => "Your GPS location is required. Please update your address or location in Profile."
        ]);
        exit;
    }

    $recipientLatitude = (float)$recipient["latitude"];
    $recipientLongitude = (float)$recipient["longitude"];
    $verificationStatus = $recipient["verification_status"] ?? "PENDING";

    // 4. Query Available Food Listings within the Specified Radius using Haversine Formula
    // 6371 = Earth's mean radius in Kilometers
    $sql = "
        SELECT
            fl.id,
            fl.donor_id,
            fl.food_title,
            fl.category,
            fl.quantity,
            fl.image,
            fl.pickup_address,
            fl.latitude,
            fl.longitude,
            fl.expiry_datetime,
            fl.status,
            fl.created_at,
            u.business_name AS donor_name,
            u.phone AS donor_phone,
            (
                6371 * ACOS(
                    LEAST(
                        1,
                        GREATEST(
                            -1,
                            COS(RADIANS(?)) * COS(RADIANS(fl.latitude)) * COS(RADIANS(fl.longitude) - RADIANS(?))
                            + SIN(RADIANS(?)) * SIN(RADIANS(fl.latitude))
                        )
                    )
                )
            ) AS distance_km
        FROM food_listings fl
        LEFT JOIN users u ON fl.donor_id = u.id
        WHERE fl.status = 'AVAILABLE'
          AND fl.expiry_datetime > NOW()
          AND fl.latitude IS NOT NULL
          AND fl.longitude IS NOT NULL
        HAVING distance_km <= ?
        ORDER BY distance_km ASC
    ";

    $foodStmt = $pdo->prepare($sql);
    $foodStmt->execute([
        $recipientLatitude,
        $recipientLongitude,
        $recipientLatitude,
        $radius
    ]);

    $food = $foodStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format distance to 2 decimal places
    foreach ($food as &$item) {
        $item["distance_km"] = round((float)$item["distance_km"], 2);
    }
    unset($item);

    // 5. Return JSON payload
    echo json_encode([
        "success" => true,
        "radius_km" => $radius,
        "verification_status" => $verificationStatus,
        "recipient" => [
            "id" => $recipientId,
            "name" => $recipient["ngo_name"],
            "latitude" => $recipientLatitude,
            "longitude" => $recipientLongitude,
            "verification_status" => $verificationStatus
        ],
        "count" => count($food),
        "food" => $food
    ]);

} catch (PDOException $e) {
    error_log("available-food error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Database error while fetching available food."
    ]);
}
?>
