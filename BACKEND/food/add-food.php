<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

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
    // HANDLE FOOD IMAGE UPLOAD (OPTIONAL)
    // ==========================================

    $imagePath = null;
    if (isset($_FILES["food_image"]) && $_FILES["food_image"]["error"] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES["food_image"]["tmp_name"];
        $fileName = $_FILES["food_image"]["name"];
        $fileSize = $_FILES["food_image"]["size"];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowedExtensions = ["jpg", "jpeg", "png", "webp"];

        if (in_array($fileExtension, $allowedExtensions)) {
            // 5MB limit
            if ($fileSize <= 5 * 1024 * 1024) {
                $uploadDir = __DIR__ . "/../../UPLOADS/food/";
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $newFileName = "food_" . time() . "_" . uniqid() . "." . $fileExtension;
                $destination = $uploadDir . $newFileName;

                if (move_uploaded_file($fileTmpPath, $destination)) {
                    $imagePath = "UPLOADS/food/" . $newFileName;
                }
            }
        }
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
        image,
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
        :image,
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
        ":image" => $imagePath,
        ":pickup_address" => $pickup_address,
        ":latitude" => $latitude,
        ":longitude" => $longitude,
        ":expiry_datetime" => $expiry_datetime
    ]);

    $newFoodId = $pdo->lastInsertId();

    // Send notification to donor
    addNotification(
        $pdo,
        $donor_id,
        "Food Listing Created",
        "Your food listing '{$food_title}' has been successfully created and is available for nearby recipients."
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    echo json_encode([
        "success" => true,
        "message" => "Food added successfully!",
        "food_id" => $newFoodId,
        "image" => $imagePath
    ]);
} catch (PDOException $e) {

    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
