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
    // GET RADIUS
    // =====================================================

    $radius = isset($_GET["radius"])
        ? (float) $_GET["radius"]
        : 5.0;

    // Allow only 5 KM or 10 KM

    if ($radius != 5.0 && $radius != 10.0) {
        $radius = 5.0;
    }


    // =====================================================
    // GET RECIPIENT LOCATION FROM USERS TABLE
    // =====================================================

    $userStmt = $pdo->prepare("
        SELECT
            id,
            role,
            latitude,
            longitude
        FROM users
        WHERE id = ?
        LIMIT 1
    ");

    $userStmt->execute([
        $recipientId
    ]);

    $recipient = $userStmt->fetch(PDO::FETCH_ASSOC);


    // =====================================================
    // CHECK RECIPIENT
    // =====================================================

    if (!$recipient) {

        echo json_encode([
            "success" => false,
            "message" => "Recipient not found."
        ]);

        exit;
    }


    // =====================================================
    // CHECK ROLE
    // =====================================================

    if (
        strtoupper(trim($recipient["role"] ?? ""))
        !== "RECIPIENT"
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid recipient."
        ]);

        exit;
    }


    // =====================================================
    // CHECK LOCATION
    // =====================================================

    if (
        $recipient["latitude"] === null ||
        $recipient["longitude"] === null ||
        $recipient["latitude"] === "" ||
        $recipient["longitude"] === ""
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Your current location is required. Please update your location first."
        ]);

        exit;
    }


    // =====================================================
    // CONVERT LOCATION TO FLOAT
    // =====================================================

    $recipientLatitude =
        (float) $recipient["latitude"];

    $recipientLongitude =
        (float) $recipient["longitude"];


    // =====================================================
    // FIND NEARBY AVAILABLE FOOD
    // =====================================================
    //
    // Haversine formula
    //
    // 6371 = Earth's radius in KM
    //
    // =====================================================

    $sql = "

        SELECT

            id,

            donor_id,

            food_title,

            category,

            quantity,

            pickup_address,

            latitude,

            longitude,

            expiry_datetime,

            status,

            created_at,

            (
                6371 * ACOS(
                    LEAST(
                        1,
                        GREATEST(
                            -1,

                            COS(
                                RADIANS(?)
                            )

                            *

                            COS(
                                RADIANS(latitude)
                            )

                            *

                            COS(
                                RADIANS(longitude)
                                -
                                RADIANS(?)
                            )

                            +

                            SIN(
                                RADIANS(?)
                            )

                            *

                            SIN(
                                RADIANS(latitude)
                            )
                        )
                    )
                )
            ) AS distance_km

        FROM food_listings

        WHERE status = 'AVAILABLE'

        AND expiry_datetime > NOW()

        AND latitude IS NOT NULL

        AND longitude IS NOT NULL

        HAVING distance_km <= ?

        ORDER BY distance_km ASC
    ";


    // =====================================================
    // EXECUTE QUERY
    // =====================================================

    $foodStmt = $pdo->prepare($sql);

    $foodStmt->execute([

        $recipientLatitude,

        $recipientLongitude,

        $recipientLatitude,

        $radius

    ]);


    // =====================================================
    // GET FOOD
    // =====================================================

    $food = $foodStmt->fetchAll(PDO::FETCH_ASSOC);


    // =====================================================
    // FORMAT DISTANCE
    // =====================================================

    foreach ($food as &$item) {

        $item["distance_km"] =
            round(
                (float) $item["distance_km"],
                2
            );
    }

    unset($item);


    // =====================================================
    // RESPONSE
    // =====================================================

    echo json_encode([

        "success" => true,

        "radius_km" => $radius,

        "recipient_location" => [

            "latitude" =>
                $recipientLatitude,

            "longitude" =>
                $recipientLongitude

        ],

        "count" =>
            count($food),

        "food" =>
            $food

    ]);


} catch (PDOException $e) {

    // Show real error while testing

    echo json_encode([

        "success" => false,

        "message" =>
            "Database error: " . $e->getMessage()

    ]);

}
?>