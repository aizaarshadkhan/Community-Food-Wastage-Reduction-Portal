<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

session_start();

$adminId = $_POST["admin_id"] ?? $_SESSION["user_id"] ?? null;
$foodId = $_POST["food_id"] ?? null;

if (!$adminId || !$foodId) {
    echo json_encode([
        "success" => false,
        "message" => "Admin ID and Food ID are required."
    ]);
    exit;
}

$adminId = (int) $adminId;
$foodId = (int) $foodId;

if ($adminId <= 0 || $foodId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request parameters."
    ]);
    exit;
}

try {
    // 1. Verify admin permissions
    $adminStmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ? LIMIT 1");
    $adminStmt->execute([$adminId]);
    $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || strtoupper($admin["role"]) !== "ADMIN") {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized. Only administrators can perform this action."
        ]);
        exit;
    }

    // 2. Verify target food exists
    $foodStmt = $pdo->prepare("SELECT id, food_title FROM food_listings WHERE id = ? LIMIT 1");
    $foodStmt->execute([$foodId]);
    $food = $foodStmt->fetch(PDO::FETCH_ASSOC);

    if (!$food) {
        echo json_encode([
            "success" => false,
            "message" => "Food listing not found."
        ]);
        exit;
    }

    $pdo->beginTransaction();

    // 3. Delete any claims linked to this food listing
    $pdo->prepare("DELETE FROM food_claims WHERE food_id = ?")->execute([$foodId]);

    // 4. Delete the food listing
    $delStmt = $pdo->prepare("DELETE FROM food_listings WHERE id = ?");
    $delStmt->execute([$foodId]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Food listing '" . $food["food_title"] . "' was removed successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin delete food error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
