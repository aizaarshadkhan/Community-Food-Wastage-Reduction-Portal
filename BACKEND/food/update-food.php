<?php
/**
 * update-food.php - Update Surplus Food Listing API
 * 
 * Requirements Handled:
 * - Allows donors to update surplus food listing details.
 * - Enforces status rule: only AVAILABLE listings can be modified.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    $foodId = $_POST["food_id"] ?? null;
    $donorId = $_POST["donor_id"] ?? null;

    $foodTitle = trim($_POST["food_title"] ?? "");
    $category = strtoupper(trim($_POST["category"] ?? ""));
    $quantity = $_POST["quantity"] ?? null;
    $pickupAddress = trim($_POST["pickup_address"] ?? "");
    $latitude = $_POST["latitude"] ?? null;
    $longitude = $_POST["longitude"] ?? null;
    $expiryDatetime = $_POST["expiry_datetime"] ?? null;

    // Validate Required IDs
    if (!$foodId || !$donorId) {
        echo json_encode(["success" => false, "message" => "Food ID and Donor ID are required."]);
        exit;
    }

    $foodId = (int)$foodId;
    $donorId = (int)$donorId;

    if ($foodTitle === "") {
        echo json_encode(["success" => false, "message" => "Food title is required."]);
        exit;
    }

    if ($category === "") {
        echo json_encode(["success" => false, "message" => "Food category is required."]);
        exit;
    }

    if ($quantity === "" || !is_numeric($quantity) || (float)$quantity <= 0) {
        echo json_encode(["success" => false, "message" => "Please enter a valid quantity."]);
        exit;
    }
    $quantity = (float)$quantity;

    if ($pickupAddress === "") {
        echo json_encode(["success" => false, "message" => "Pickup address is required."]);
        exit;
    }

    if ($latitude === "" || $longitude === "" || !is_numeric($latitude) || !is_numeric($longitude)) {
        echo json_encode(["success" => false, "message" => "Valid latitude and longitude are required."]);
        exit;
    }
    $latitude = (float)$latitude;
    $longitude = (float)$longitude;

    if (!$expiryDatetime) {
        echo json_encode(["success" => false, "message" => "Expiry date and time are required."]);
        exit;
    }

    $expiryDatetime = str_replace("T", " ", $expiryDatetime);
    if (strlen($expiryDatetime) === 16) {
        $expiryDatetime .= ":00";
    }

    // Verify ownership and check listing status
    $checkSql = "
        SELECT id, status
        FROM food_listings
        WHERE id = :food_id AND donor_id = :donor_id
        LIMIT 1
    ";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([
        ":food_id" => $foodId,
        ":donor_id" => $donorId
    ]);
    $food = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$food) {
        echo json_encode(["success" => false, "message" => "Food listing not found or unauthorized."]);
        exit;
    }

    if (strtoupper($food["status"]) !== "AVAILABLE") {
        echo json_encode(["success" => false, "message" => "Only AVAILABLE food listings can be edited."]);
        exit;
    }

    // Update food listing
    $updateSql = "
        UPDATE food_listings
        SET
            food_title = :food_title,
            category = :category,
            quantity = :quantity,
            pickup_address = :pickup_address,
            latitude = :latitude,
            longitude = :longitude,
            expiry_datetime = :expiry_datetime
        WHERE id = :food_id AND donor_id = :donor_id AND status = 'AVAILABLE'
    ";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([
        ":food_title" => $foodTitle,
        ":category" => $category,
        ":quantity" => $quantity,
        ":pickup_address" => $pickupAddress,
        ":latitude" => $latitude,
        ":longitude" => $longitude,
        ":expiry_datetime" => $expiryDatetime,
        ":food_id" => $foodId,
        ":donor_id" => $donorId
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Food listing updated successfully."
    ]);

} catch (PDOException $e) {
    error_log("update-food error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error while updating food listing."]);
}
?>
