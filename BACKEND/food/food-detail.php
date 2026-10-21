<?php

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // ==========================================
    // GET FOOD ID
    // ==========================================

    $foodId = $_GET["food_id"] ?? null;

    if (!$foodId) {

        echo json_encode([
            "success" => false,
            "message" => "Food ID is required."
        ]);

        exit;
    }

    $foodId = (int) $foodId;

    if ($foodId <= 0) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid food ID."
        ]);

        exit;
    }


    // ==========================================
    // GET FOOD + RECEIVER DETAILS
    // ==========================================

    $stmt = $pdo->prepare("

        SELECT

            f.id,
            f.donor_id,
            f.food_title,
            f.category,
            f.quantity,
            f.pickup_address,
            f.latitude,
            f.longitude,
            f.expiry_datetime,
            f.status,
            f.claimed_by,
            f.created_at,

            /* RECEIVER DETAILS */

            r.id AS receiver_id,
            r.ngo_name AS receiver_organization,
            r.contact_person AS receiver_contact_person,
            r.phone AS receiver_phone,
            r.address AS receiver_address

        FROM food_listings f

        LEFT JOIN users r
            ON r.id = f.claimed_by
            AND UPPER(r.role) = 'RECIPIENT'

        WHERE f.id = ?

        LIMIT 1

    ");


    $stmt->execute([$foodId]);


    $food = $stmt->fetch(PDO::FETCH_ASSOC);


    // ==========================================
    // FOOD NOT FOUND
    // ==========================================

    if (!$food) {

        echo json_encode([
            "success" => false,
            "message" => "Food listing not found."
        ]);

        exit;
    }


    // ==========================================
    // RECEIVER INFORMATION
    // ==========================================

    if (
        strtoupper($food["status"]) === "CLAIMED" ||
        strtoupper($food["status"]) === "DELIVERED"
    ) {

        $food["receiver"] = [

            "id" =>
                $food["receiver_id"] ?? null,

            "organization" =>
                $food["receiver_organization"] ?? null,

            "contact_person" =>
                $food["receiver_contact_person"] ?? null,

            "phone" =>
                $food["receiver_phone"] ?? null,

            "address" =>
                $food["receiver_address"] ?? null

        ];

    } else {

        $food["receiver"] = null;

    }


    // ==========================================
    // REMOVE RAW JOIN FIELDS
    // ==========================================

    unset(
        $food["receiver_id"],
        $food["receiver_organization"],
        $food["receiver_contact_person"],
        $food["receiver_phone"],
        $food["receiver_address"]
    );


    // ==========================================
    // RESPONSE
    // ==========================================

    echo json_encode([

        "success" => true,

        "food" => $food

    ]);


} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" => "Database error."

    ]);

}

?>