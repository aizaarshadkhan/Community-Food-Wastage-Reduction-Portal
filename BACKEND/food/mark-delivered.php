<?php

header("Content-Type: application/json");

require_once "../config/db.php";


// ==========================================
// CHECK REQUEST METHOD
// ==========================================

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);

    exit;
}


// ==========================================
// GET DATA
// ==========================================

$food_id = $_POST["food_id"] ?? "";
$donor_id = $_POST["donor_id"] ?? "";


// ==========================================
// VALIDATE DATA
// ==========================================

if (empty($food_id) || empty($donor_id)) {

    echo json_encode([
        "success" => false,
        "message" => "Food ID and donor ID are required."
    ]);

    exit;
}


try {

    // ==========================================
    // FIND FOOD LISTING
    // ==========================================

    $sql = "
        SELECT
            id,
            donor_id,
            status
        FROM food_listings
        WHERE id = ?
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        $food_id
    ]);

    $food = $stmt->fetch();


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
    // CHECK DONOR
    // ==========================================

    if ((int) $food["donor_id"] !== (int) $donor_id) {

        echo json_encode([
            "success" => false,
            "message" => "You are not allowed to update this food listing."
        ]);

        exit;
    }


    // ==========================================
    // CHECK CURRENT STATUS
    // ==========================================

    if ($food["status"] !== "CLAIMED") {

        echo json_encode([
            "success" => false,
            "message" => "Only claimed food can be marked as delivered."
        ]);

        exit;
    }


    // ==========================================
    // UPDATE STATUS
    // CLAIMED → DELIVERED
    // ==========================================

    $updateSql = "
        UPDATE food_listings
        SET status = 'DELIVERED'
        WHERE id = ?
        AND donor_id = ?
        AND status = 'CLAIMED'
    ";

    $updateStmt = $pdo->prepare($updateSql);

    $updateStmt->execute([
        $food_id,
        $donor_id
    ]);


    // ==========================================
    // CHECK UPDATE
    // ==========================================

    if ($updateStmt->rowCount() > 0) {

        echo json_encode([
            "success" => true,
            "message" => "Food marked as delivered successfully."
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => "Food status could not be updated."
        ]);
    }


} catch (PDOException $e) {

    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);

}

?>