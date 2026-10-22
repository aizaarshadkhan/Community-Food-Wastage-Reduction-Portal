<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";

try {

    // =====================================================
    // GET RECIPIENT ID
    // =====================================================

    $recipientId = $_GET["recipient_id"] ?? null;

    if (!$recipientId) {

        echo json_encode([
            "success" => false,
            "message" => "Recipient ID is required."
        ]);

        exit;
    }

    $recipientId = (int) $recipientId;

    if ($recipientId <= 0) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid recipient ID."
        ]);

        exit;
    }


    // =====================================================
    // CHECK RECIPIENT
    // =====================================================

    $userStmt = $pdo->prepare("
        SELECT id, role
        FROM users
        WHERE id = ?
        LIMIT 1
    ");

    $userStmt->execute([$recipientId]);

    $recipient = $userStmt->fetch(PDO::FETCH_ASSOC);


    if (!$recipient) {

        echo json_encode([
            "success" => false,
            "message" => "Recipient not found."
        ]);

        exit;
    }


    if (strtoupper($recipient["role"]) !== "RECIPIENT") {

        echo json_encode([
            "success" => false,
            "message" => "Invalid recipient."
        ]);

        exit;
    }


    // =====================================================
    // GET CLAIMS TO DISPLAY
    // =====================================================

    $claimStmt = $pdo->prepare("

        SELECT

            fc.id AS claim_id,

            fc.food_id,

            fc.recipient_id,

            fc.claimed_at,

            fc.delivered_at,

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

            fb.id AS feedback_id,

            fb.rating AS feedback_rating,

            fb.comment AS feedback_comment

        FROM food_claims fc

        INNER JOIN food_listings fl
            ON fc.food_id = fl.id

        LEFT JOIN feedback fb
            ON fb.food_id = fl.id AND fb.recipient_id = fc.recipient_id

        WHERE fc.recipient_id = ?

        AND (

            fl.status <> 'DELIVERED'

            OR (

                fl.status = 'DELIVERED'

                AND fc.delivered_at IS NOT NULL

                AND fc.delivered_at > DATE_SUB(NOW(), INTERVAL 7 DAY)

            )

        )

        ORDER BY fc.claimed_at DESC

    ");

    $claimStmt->execute([$recipientId]);

    $claims = $claimStmt->fetchAll(PDO::FETCH_ASSOC);


    // =====================================================
    // GET STATISTICS
    // =====================================================

    $statsStmt = $pdo->prepare("

        SELECT

            SUM(
                CASE
                    WHEN fl.status = 'CLAIMED'
                    THEN 1
                    ELSE 0
                END
            ) AS claimed,

            SUM(
                CASE
                    WHEN fl.status = 'DELIVERED'
                    THEN 1
                    ELSE 0
                END
            ) AS delivered

        FROM food_claims fc

        INNER JOIN food_listings fl
            ON fc.food_id = fl.id

        WHERE fc.recipient_id = ?

    ");

    $statsStmt->execute([$recipientId]);

    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);


    // =====================================================
    // RESPONSE
    // =====================================================

    echo json_encode([

        "success" => true,

        "claims" => $claims,

        "stats" => [

            "claimed" => (int) ($stats["claimed"] ?? 0),

            "delivered" => (int) ($stats["delivered"] ?? 0)

        ]

    ]);


} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" => "Database error while loading claims."

    ]);

}

?>
