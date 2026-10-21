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
// VALIDATE
// ==========================================

if (empty($food_id) || empty($donor_id)) {

    echo json_encode([
        "success" => false,
        "message" => "Food ID and donor ID are required."
    ]);

    exit;
}


$food_id = (int) $food_id;
$donor_id = (int) $donor_id;


// ==========================================
// DELETE FOOD
// ==========================================

try {

    // First make sure this food belongs
    // to the logged-in donor

    $checkSql = "
        SELECT id, status
        FROM food_listings
        WHERE id = :food_id
        AND donor_id = :donor_id
        LIMIT 1
    ";

    $checkStmt = $pdo->prepare($checkSql);

    $checkStmt->execute([
        ":food_id" => $food_id,
        ":donor_id" => $donor_id
    ]);

    $food = $checkStmt->fetch();


    // ==========================================
    // FOOD NOT FOUND
    // ==========================================

    if (!$food) {

        echo json_encode([
            "success" => false,
            "message" => "Food listing not found or you are not allowed to delete it."
        ]);

        exit;
    }


    // ==========================================
    // OPTIONAL SAFETY CHECK
    // ==========================================

    // Don't allow deleting already delivered food

    if ($food["status"] !== "AVAILABLE") {

        echo json_encode([
            "success" => false,
            "message" => "Only AVAILABLE food listings can be deleted."
        ]);

        exit;
    }


    // ==========================================
    // DELETE
    // ==========================================

    $deleteSql = "
        DELETE FROM food_listings
        WHERE id = :food_id
        AND donor_id = :donor_id
        AND status = 'AVAILABLE'
    ";

    $deleteStmt = $pdo->prepare($deleteSql);

    $deleteStmt->execute([
        ":food_id" => $food_id,
        ":donor_id" => $donor_id
    ]);


    // ==========================================
    // CHECK RESULT
    // ==========================================

    if ($deleteStmt->rowCount() > 0) {

        echo json_encode([
            "success" => true,
            "message" => "Food listing deleted successfully."
        ]);
    } else {

        echo json_encode([
            "success" => false,
            "message" => "Food listing could not be deleted."
        ]);
    }
} catch (PDOException $e) {

    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
