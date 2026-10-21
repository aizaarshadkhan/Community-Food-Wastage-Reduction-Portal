<?php

header("Content-Type: application/json");

require_once "../config/db.php";


try {

    // =====================================================
    // GET DATA FROM JAVASCRIPT
    // =====================================================

    $foodId = $_POST["food_id"] ?? null;
    $donorId = $_POST["donor_id"] ?? null;

    $foodTitle = trim($_POST["food_title"] ?? "");
    $category = trim($_POST["category"] ?? "");
    $quantity = $_POST["quantity"] ?? null;
    $pickupAddress = trim($_POST["pickup_address"] ?? "");

    $latitude = $_POST["latitude"] ?? null;
    $longitude = $_POST["longitude"] ?? null;

    $expiryDatetime = $_POST["expiry_datetime"] ?? null;


    // =====================================================
    // CHECK REQUIRED IDs
    // =====================================================

    if (!$foodId) {

        echo json_encode([
            "success" => false,
            "message" => "Food ID is required."
        ]);

        exit;
    }


    if (!$donorId) {

        echo json_encode([
            "success" => false,
            "message" => "Donor ID is required."
        ]);

        exit;
    }


    // =====================================================
    // CONVERT IDs TO INTEGER
    // =====================================================

    $foodId = (int) $foodId;
    $donorId = (int) $donorId;


    // =====================================================
    // VALIDATE FOOD TITLE
    // =====================================================

    if ($foodTitle === "") {

        echo json_encode([
            "success" => false,
            "message" => "Food title is required."
        ]);

        exit;
    }


    // =====================================================
    // VALIDATE CATEGORY
    // =====================================================

    if ($category === "") {

        echo json_encode([
            "success" => false,
            "message" => "Food category is required."
        ]);

        exit;
    }

    if ($category !== "VEG" && $category !== "NON_VEG") {

        echo json_encode([
            "success" => false,
            "message" => "Invalid food category."
        ]);

        exit;
    }


    // =====================================================
    // VALIDATE QUANTITY
    // =====================================================

    if ($quantity === "" || !is_numeric($quantity) || (float)$quantity <= 0) {

        echo json_encode([
            "success" => false,
            "message" => "Please enter a valid quantity."
        ]);

        exit;
    }


    $quantity = (float) $quantity;


    // =====================================================
    // VALIDATE PICKUP ADDRESS
    // =====================================================

    if ($pickupAddress === "") {

        echo json_encode([
            "success" => false,
            "message" => "Pickup address is required."
        ]);

        exit;
    }


    // =====================================================
    // VALIDATE LOCATION
    // =====================================================

    if (
        $latitude === "" ||
        $longitude === "" ||
        !is_numeric($latitude) ||
        !is_numeric($longitude)
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Valid latitude and longitude are required."
        ]);

        exit;
    }


    $latitude = (float) $latitude;
    $longitude = (float) $longitude;


    // =====================================================
    // VALIDATE EXPIRY
    // =====================================================

    if (!$expiryDatetime) {

        echo json_encode([
            "success" => false,
            "message" => "Expiry date and time are required."
        ]);

        exit;
    }


    /*
     * HTML datetime-local sends:
     *
     * 2026-08-22T20:30
     *
     * MySQL DATETIME expects:
     *
     * 2026-08-22 20:30:00
     */

    $expiryDatetime = str_replace("T", " ", $expiryDatetime);


    // Add seconds if they are not already present

    if (strlen($expiryDatetime) === 16) {

        $expiryDatetime .= ":00";
    }


    // =====================================================
    // CHECK THAT FOOD BELONGS TO THIS DONOR
    // =====================================================

    $checkSql = "
        SELECT
            id,
            status

        FROM food_listings

        WHERE id = :food_id
        AND donor_id = :donor_id

        LIMIT 1
    ";


    $checkStmt = $pdo->prepare($checkSql);

    $checkStmt->execute([
        ":food_id" => $foodId,
        ":donor_id" => $donorId
    ]);


    $food = $checkStmt->fetch();


    // =====================================================
    // FOOD NOT FOUND
    // =====================================================

    if (!$food) {

        echo json_encode([
            "success" => false,
            "message" => "Food listing not found or you do not have permission to edit it."
        ]);

        exit;
    }


    // =====================================================
    // ONLY AVAILABLE FOOD CAN BE EDITED
    // =====================================================

    if (strtoupper($food["status"]) !== "AVAILABLE") {

        echo json_encode([
            "success" => false,
            "message" => "Only AVAILABLE food listings can be edited."
        ]);

        exit;
    }


    // =====================================================
    // UPDATE FOOD LISTING
    // =====================================================

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

        WHERE id = :food_id
        AND donor_id = :donor_id
        AND status = 'AVAILABLE'
    ";


    $updateStmt = $pdo->prepare($updateSql);


    $updateStmt->execute([

        ":food_title" =>
        $foodTitle,

        ":category" =>
        $category,

        ":quantity" =>
        $quantity,

        ":pickup_address" =>
        $pickupAddress,

        ":latitude" =>
        $latitude,

        ":longitude" =>
        $longitude,

        ":expiry_datetime" =>
        $expiryDatetime,

        ":food_id" =>
        $foodId,

        ":donor_id" =>
        $donorId

    ]);


    // =====================================================
    // CHECK UPDATE
    // =====================================================

    if ($updateStmt->rowCount() > 0) {

        echo json_encode([

            "success" => true,

            "message" =>
            "Food listing updated successfully."

        ]);
    } else {

        /*
         * rowCount() can be 0 if the user submits
         * exactly the same values.
         *
         * We still consider that a successful request.
         */

        echo json_encode([

            "success" => true,

            "message" =>
            "Food listing saved successfully."

        ]);
    }
} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" =>
        "Database error: " . $e->getMessage()

    ]);
}
