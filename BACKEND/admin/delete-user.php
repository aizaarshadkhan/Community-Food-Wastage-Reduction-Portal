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
$userId = $_POST["user_id"] ?? null;

if (!$adminId || !$userId) {
    echo json_encode([
        "success" => false,
        "message" => "Admin ID and User ID are required."
    ]);
    exit;
}

$adminId = (int) $adminId;
$userId = (int) $userId;

if ($adminId <= 0 || $userId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid user parameters."
    ]);
    exit;
}

// Cannot delete self
if ($adminId === $userId) {
    echo json_encode([
        "success" => false,
        "message" => "You cannot delete your own admin account."
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

    // 2. Verify target user exists
    $userStmt = $pdo->prepare("SELECT id, role, email FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "success" => false,
            "message" => "User not found."
        ]);
        exit;
    }

    $pdo->beginTransaction();

    // 3. Clean up related dependencies based on role
    // Delete claims on donations posted by this user
    $pdo->prepare("
        DELETE fc FROM food_claims fc
        INNER JOIN food_listings fl ON fc.food_id = fl.id
        WHERE fl.donor_id = ?
    ")->execute([$userId]);

    // Delete food listings posted by this user
    $pdo->prepare("DELETE FROM food_listings WHERE donor_id = ?")->execute([$userId]);

    // Delete claims made by this user as recipient
    $pdo->prepare("DELETE FROM food_claims WHERE recipient_id = ?")->execute([$userId]);

    // Revert any food claimed by this recipient back to AVAILABLE if not delivered
    $pdo->prepare("
        UPDATE food_listings 
        SET status = 'AVAILABLE', claimed_by = NULL 
        WHERE claimed_by = ? AND status = 'CLAIMED'
    ")->execute([$userId]);

    // For any delivered food, dissociate claimed_by
    $pdo->prepare("
        UPDATE food_listings 
        SET claimed_by = NULL 
        WHERE claimed_by = ?
    ")->execute([$userId]);

    // 4. Delete the user
    $delStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $delStmt->execute([$userId]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "User " . $user["email"] . " and all associated records have been removed successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin delete user error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
