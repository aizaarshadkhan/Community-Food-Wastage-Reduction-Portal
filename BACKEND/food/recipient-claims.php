<?php

header("Content-Type: application/json");

require_once "../config/db.php";

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
    //
    // Normal CLAIMED items are displayed.
    //
    // DELIVERED items are displayed ONLY for 12 hours
    // after delivered_at.
    //
    // If delivered_at is NULL, the delivered item is
    // hidden because we don't know when it was delivered.
    //
    // IMPORTANT:
    // This affects ONLY the visible claims list.
    // It does NOT affect the Received count.
    // =====================================================

    $claimStmt = $pdo->prepare("

        SELECT

            fc.id AS claim_id,

            fc.food_id,

            fc.recipient_id,

            fc.claimed_at,

            fc.delivered_at,

            fl.food_title,

            fl.category,

            fl.quantity,

            fl.pickup_address,

            fl.latitude,

            fl.longitude,

            fl.expiry_datetime,

            fl.status

        FROM food_claims fc

        INNER JOIN food_listings fl
            ON fc.food_id = fl.id

        WHERE fc.recipient_id = ?

        AND (

            fl.status <> 'DELIVERED'

            OR (

                fl.status = 'DELIVERED'

                AND fc.delivered_at IS NOT NULL

                AND fc.delivered_at > DATE_SUB(NOW(), INTERVAL 12 HOUR)

            )

        )

        ORDER BY fc.claimed_at DESC

    ");

    $claimStmt->execute([$recipientId]);

    $claims = $claimStmt->fetchAll(PDO::FETCH_ASSOC);


    // =====================================================
    // GET STATISTICS
    //
    // Received is TOTAL delivered food.
    //
    // This query intentionally DOES NOT use the 12-hour
    // filter.
    //
    // Therefore:
    //
    // Delivered 2 hours ago  -> counted
    // Delivered 10 hours ago -> counted
    // Delivered 20 hours ago -> counted
    // Delivered 5 days ago   -> counted
    //
    // They may disappear from My Claims, but they remain
    // part of the Received total.
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