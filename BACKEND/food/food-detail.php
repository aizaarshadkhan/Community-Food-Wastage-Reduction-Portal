<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";

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
    // GET FOOD + DONOR + RECEIVER + FEEDBACK
    // ==========================================

    $stmt = $pdo->prepare("

        SELECT

            f.id,
            f.donor_id,
            f.food_title,
            f.category,
            f.quantity,
            f.image,
            f.pickup_address,
            f.latitude,
            f.longitude,
            f.expiry_datetime,
            CASE WHEN f.status = 'AVAILABLE' AND f.expiry_datetime <= NOW() THEN 'EXPIRED' ELSE f.status END AS status,
            f.claimed_by,
            f.created_at,

            /* DONOR DETAILS */
            d.business_name AS donor_business_name,
            d.contact_person AS donor_contact_person,
            d.email AS donor_email,
            d.phone AS donor_phone,
            d.address AS donor_address,

            /* RECEIVER DETAILS */
            r.id AS receiver_id,
            r.ngo_name AS receiver_organization,
            r.contact_person AS receiver_contact_person,
            r.email AS receiver_email,
            r.phone AS receiver_phone,
            r.address AS receiver_address,

            /* CLAIM DETAILS */
            fc.claimed_at,
            fc.delivered_at,

            /* FEEDBACK DETAILS */
            fb.rating AS feedback_rating,
            fb.comment AS feedback_comment,
            fb.created_at AS feedback_created_at

        FROM food_listings f

        LEFT JOIN users d
            ON d.id = f.donor_id

        LEFT JOIN users r
            ON r.id = f.claimed_by
            AND UPPER(r.role) = 'RECIPIENT'

        LEFT JOIN food_claims fc
            ON fc.food_id = f.id

        LEFT JOIN feedback fb
            ON fb.food_id = f.id

        WHERE f.id = ?

        ORDER BY fc.id DESC
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
    // STRUCTURE DONOR INFORMATION
    // ==========================================

    $food["donor"] = [
        "id" => $food["donor_id"] ?? null,
        "name" => $food["donor_business_name"] ?: ($food["donor_contact_person"] ?: "Donor"),
        "contact_person" => $food["donor_contact_person"] ?? null,
        "email" => $food["donor_email"] ?? null,
        "phone" => $food["donor_phone"] ?? null,
        "address" => $food["donor_address"] ?? null
    ];


    // ==========================================
    // STRUCTURE RECEIVER INFORMATION
    // ==========================================

    if (
        strtoupper($food["status"]) === "CLAIMED" ||
        strtoupper($food["status"]) === "DELIVERED"
    ) {

        $food["receiver"] = [
            "id" => $food["receiver_id"] ?? null,
            "organization" => $food["receiver_organization"] ?? null,
            "contact_person" => $food["receiver_contact_person"] ?? null,
            "email" => $food["receiver_email"] ?? null,
            "phone" => $food["receiver_phone"] ?? null,
            "address" => $food["receiver_address"] ?? null
        ];

        $food["claim"] = [
            "claimed_at" => $food["claimed_at"] ?? null,
            "delivered_at" => $food["delivered_at"] ?? null
        ];

    } else {

        $food["receiver"] = null;
        $food["claim"] = null;

    }


    // ==========================================
    // STRUCTURE FEEDBACK
    // ==========================================

    if ($food["feedback_rating"] !== null) {
        $food["feedback"] = [
            "rating" => (int) $food["feedback_rating"],
            "comment" => $food["feedback_comment"],
            "created_at" => $food["feedback_created_at"]
        ];
    } else {
        $food["feedback"] = null;
    }


    // ==========================================
    // REMOVE RAW JOIN FIELDS
    // ==========================================

    unset(
        $food["donor_business_name"],
        $food["donor_contact_person"],
        $food["donor_email"],
        $food["donor_phone"],
        $food["donor_address"],
        $food["receiver_id"],
        $food["receiver_organization"],
        $food["receiver_contact_person"],
        $food["receiver_email"],
        $food["receiver_phone"],
        $food["receiver_address"],
        $food["claimed_at"],
        $food["delivered_at"],
        $food["feedback_rating"],
        $food["feedback_comment"],
        $food["feedback_created_at"]
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

        "message" => "Database error: " . $e->getMessage()

    ]);

}

?>
