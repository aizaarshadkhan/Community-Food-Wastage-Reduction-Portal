<?php

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // Only allow POST requests
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {

        echo json_encode([
            "success" => false,
            "message" => "Invalid request method."
        ]);

        exit;
    }


    // ==========================================
    // GET FORM DATA
    // ==========================================

    $donor_id = $_POST["donor_id"] ?? null;
    $food_title = trim($_POST["food_title"] ?? "");
    $category = $_POST["category"] ?? "";
    $quantity = $_POST["quantity"] ?? null;
    $pickup_address = trim($_POST["pickup_address"] ?? "");
    $latitude = $_POST["latitude"] ?? null;
    $longitude = $_POST["longitude"] ?? null;
    $expiry_datetime = $_POST["expiry_datetime"] ?? "";


    // ==========================================
    // VALIDATE REQUIRED FIELDS
    // ==========================================

    if (
        empty($donor_id) ||
        empty($food_title) ||
        empty($category) ||
        empty($quantity) ||
        empty($pickup_address) ||
        $latitude === null ||
        $latitude === "" ||
        $longitude === null ||
        $longitude === "" ||
        empty($expiry_datetime)
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Please fill in all required fields."
        ]);

        exit;
    }


    // ==========================================
    // VALIDATE DONOR ID
    // ==========================================

    $donor_id = (int) $donor_id;


    // Make sure this user actually exists
    // and is a DONOR

    $donorStmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE id = ?
        AND role = 'DONOR'
        LIMIT 1
    ");

    $donorStmt->execute([$donor_id]);

    $donor = $donorStmt->fetch();


    if (!$donor) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid donor."
        ]);

        exit;
    }


    // ==========================================
    // VALIDATE CATEGORY
    // ==========================================

    if ($category !== "VEG" && $category !== "NON_VEG") {

        echo json_encode([
            "success" => false,
            "message" => "Invalid food category."
        ]);

        exit;
    }


    // ==========================================
    // ADD FOOD
    // ==========================================

    $sql = "
    INSERT INTO food_listings 
    (
        donor_id,
        food_title,
        category,
        quantity,
        pickup_address,
        latitude,
        longitude,
        expiry_datetime,
        status
    )
    VALUES
    (
        :donor_id,
        :food_title,
        :category,
        :quantity,
        :pickup_address,
        :latitude,
        :longitude,
        :expiry_datetime,
        'AVAILABLE'
    )
";



    $stmt = $pdo->prepare($sql);


    $stmt->execute([

        ":donor_id" => $donor_id,

        ":food_title" => $food_title,

        ":category" => $category,

        ":quantity" => $quantity,

        ":pickup_address" => $pickup_address,

        ":latitude" => $latitude,

        ":longitude" => $longitude,

        ":expiry_datetime" => $expiry_datetime

    ]);


    // ==========================================
    // SUCCESS
    // ==========================================

    echo json_encode([

        "success" => true,

        "message" => "Food added successfully!",

        "food_id" => $pdo->lastInsertId()

    ]);
} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" => "Database error: " . $e->getMessage()

    ]);
}
