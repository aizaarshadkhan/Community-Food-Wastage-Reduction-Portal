<?php
/**
 * add-food.php - Surplus Food Donation Listing API
 * 
 * Functional Requirements Handled:
 * 1. Donation Listing:
 *    - Upload surplus food details: title, category, quantity, expiry timestamp, pickup address, GPS coordinates, food photo.
 * 2. Notification Engine:
 *    - Automatically calculates proximity using Haversine formula and dispatches in-app notification alerts
 *      to all NGOs/shelters within 15 km whenever a new donation is posted in their area.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method."]);
    exit;
}

try {
    // 1. Extract and Trim Inputs
    $donor_id = $_POST["donor_id"] ?? null;
    $food_title = trim($_POST["food_title"] ?? "");
    $category = strtoupper(trim($_POST["category"] ?? ""));
    $quantity = trim($_POST["quantity"] ?? "");
    $pickup_address = trim($_POST["pickup_address"] ?? "");
    $latitude = $_POST["latitude"] ?? null;
    $longitude = $_POST["longitude"] ?? null;
    $expiry_datetime = $_POST["expiry_datetime"] ?? "";

    // 2. Validate Required Fields
    if (
        empty($donor_id) ||
        empty($food_title) ||
        empty($category) ||
        empty($quantity) ||
        empty($pickup_address) ||
        $latitude === null || $latitude === "" ||
        $longitude === null || $longitude === "" ||
        empty($expiry_datetime)
    ) {
        echo json_encode(["success" => false, "message" => "Please fill in all required fields."]);
        exit;
    }

    $donor_id = (int)$donor_id;

    // 3. Verify Donor Account
    $donorStmt = $pdo->prepare("SELECT id, business_name FROM users WHERE id = ? AND role = 'DONOR' LIMIT 1");
    $donorStmt->execute([$donor_id]);
    $donor = $donorStmt->fetch(PDO::FETCH_ASSOC);

    if (!$donor) {
        echo json_encode(["success" => false, "message" => "Invalid donor account."]);
        exit;
    }

    // 4. Validate Expiry Datetime (Must be in the future)
    if (strtotime($expiry_datetime) <= time()) {
        echo json_encode(["success" => false, "message" => "Expiry date and time must be set in the future."]);
        exit;
    }

    // 5. Handle Optional Food Photo Upload
    $imagePath = null;
    if (isset($_FILES["food_image"]) && $_FILES["food_image"]["error"] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES["food_image"]["tmp_name"];
        $fileName = $_FILES["food_image"]["name"];
        $fileSize = $_FILES["food_image"]["size"];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowedExtensions = ["jpg", "jpeg", "png", "webp"];

        if (in_array($fileExtension, $allowedExtensions)) {
            // 5MB max upload limit
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

    // 6. Insert Food Listing into Database
    $sql = "
        INSERT INTO food_listings (
            donor_id, food_title, category, quantity, image,
            pickup_address, latitude, longitude, expiry_datetime, status
        ) VALUES (
            :donor_id, :food_title, :category, :quantity, :image,
            :pickup_address, :latitude, :longitude, :expiry_datetime, 'AVAILABLE'
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
        ":latitude" => (float)$latitude,
        ":longitude" => (float)$longitude,
        ":expiry_datetime" => $expiry_datetime
    ]);

    $newFoodId = $pdo->lastInsertId();

    // 7. Notification Engine: Notify Donor of Listing Creation
    addNotification(
        $pdo,
        $donor_id,
        "Food Listing Created",
        "Your surplus food listing '{$food_title}' has been posted and is now visible to nearby NGOs."
    );

    // 8. Notification Engine: Send automated alerts to nearby NGOs within 15 km (Requirement 6)
    try {
        $nearbySql = "
            SELECT id, ngo_name,
            ROUND(
                6371 * ACOS(
                    LEAST(
                        1,
                        GREATEST(
                            -1,
                            COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
                            + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
                        )
                    )
                ), 1
            ) AS distance_km
            FROM users
            WHERE role = 'RECIPIENT'
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
            HAVING distance_km <= 15
        ";
        $nearbyStmt = $pdo->prepare($nearbySql);
        $nearbyStmt->execute([(float)$latitude, (float)$longitude, (float)$latitude]);
        $nearbyRecipients = $nearbyStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($nearbyRecipients as $ngo) {
            addNotification(
                $pdo,
                $ngo["id"],
                "New Food Donation Nearby! 🍲",
                "Surplus food '{$food_title}' ({$quantity}) was just listed {$ngo['distance_km']} km away at {$pickup_address}."
            );
        }
    } catch (Exception $notifEx) {
        error_log("Failed to dispatch proximity notifications: " . $notifEx->getMessage());
    }

    echo json_encode([
        "success" => true,
        "message" => "Food listing successfully published! Nearby NGOs have been alerted.",
        "food_id" => $newFoodId,
        "image" => $imagePath
    ]);

} catch (PDOException $e) {
    error_log("add-food error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
