
<?php

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // GET DONOR ID
    $donorId = $_GET["donor_id"] ?? null;

    if (!$donorId) {
        echo json_encode([
            "success" => false,
            "message" => "Donor ID is required."
        ]);
        exit;
    }

    $donorId = (int) $donorId;

    if ($donorId <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid donor ID."
        ]);
        exit;
    }

    // GET STATISTICS
    $statsSql = "
        SELECT
            COUNT(*) AS total,

            COALESCE(SUM(
                CASE
                    WHEN status = 'AVAILABLE'
                         AND expiry_datetime > NOW()
                    THEN 1 ELSE 0
                END
            ), 0) AS available,

            COALESCE(SUM(
                CASE
                    WHEN status = 'AVAILABLE'
                         AND expiry_datetime <= NOW()
                    THEN 1 ELSE 0
                END
            ), 0) AS expired,

            COALESCE(SUM(
                CASE
                    WHEN status = 'CLAIMED'
                    THEN 1 ELSE 0
                END
            ), 0) AS claimed,

            COALESCE(SUM(
                CASE
                    WHEN status = 'DELIVERED'
                    THEN 1 ELSE 0
                END
            ), 0) AS delivered

        FROM food_listings
        WHERE donor_id = :donor_id
    ";

    $statsStmt = $pdo->prepare($statsSql);
    $statsStmt->execute([
        ":donor_id" => $donorId
    ]);

    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // GET FOOD LISTINGS
    // Show EXPIRED for expired donations that
    // are still stored as AVAILABLE.
    $foodSql = "
        SELECT
            f.id,
            f.food_title,
            f.category,
            f.quantity,
            f.pickup_address,
            f.latitude,
            f.longitude,
            f.expiry_datetime,

            CASE
                WHEN f.status = 'AVAILABLE'
                     AND f.expiry_datetime <= NOW()
                THEN 'EXPIRED'
                ELSE f.status
            END AS status,

            f.claimed_by,
            f.created_at,

            u.ngo_name AS ngo_name,
            u.contact_person AS contact_person,
            u.phone AS recipient_phone,
            u.address AS recipient_address

        FROM food_listings f

        LEFT JOIN users u
            ON f.claimed_by = u.id
            AND u.role = 'RECIPIENT'

        WHERE f.donor_id = :donor_id

        ORDER BY f.created_at DESC
    ";

    $foodStmt = $pdo->prepare($foodSql);
    $foodStmt->execute([
        ":donor_id" => $donorId
    ]);

    $foodListings = $foodStmt->fetchAll(PDO::FETCH_ASSOC);

    // RETURN RESPONSE
    echo json_encode([
        "success" => true,

        "stats" => [
            "total" => (int) ($stats["total"] ?? 0),
            "available" => (int) ($stats["available"] ?? 0),
            "expired" => (int) ($stats["expired"] ?? 0),
            "claimed" => (int) ($stats["claimed"] ?? 0),
            "delivered" => (int) ($stats["delivered"] ?? 0)
        ],

        "food" => $foodListings
    ]);

} catch (PDOException $e) {

    error_log("Donor food error: " . $e->getMessage());

    echo json_encode([
        "success" => false,
        "message" => "Unable to load donor food listings."
    ]);
}
?>
