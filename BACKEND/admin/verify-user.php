<?php
/**
 * verify-user.php - Admin User Verification API
 * 
 * Functional Requirements Handled:
 * - Admin Side: Verification status for new donors/NGOs.
 * - Notification Engine: Sends status alert to the affected user.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method."]);
    exit;
}

try {
    $admin_id = $_POST["admin_id"] ?? null;
    $target_user_id = $_POST["user_id"] ?? null;
    $status = strtoupper(trim($_POST["status"] ?? ""));

    // 1. Validate Admin
    if (!$admin_id || !$target_user_id) {
        echo json_encode(["success" => false, "message" => "Admin ID and Target User ID are required."]);
        exit;
    }

    $adminCheck = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'ADMIN' LIMIT 1");
    $adminCheck->execute([(int)$admin_id]);
    if (!$adminCheck->fetch()) {
        echo json_encode(["success" => false, "message" => "Unauthorized access. Admin role required."]);
        exit;
    }

    // 2. Validate Status Option
    if ($status !== "VERIFIED" && $status !== "REJECTED" && $status !== "PENDING") {
        echo json_encode(["success" => false, "message" => "Invalid verification status value."]);
        exit;
    }

    // 3. Update Verification Status
    $updateStmt = $pdo->prepare("UPDATE users SET verification_status = ? WHERE id = ?");
    $updateStmt->execute([$status, (int)$target_user_id]);

    // 4. Send Status Update Notification
    if ($status === "VERIFIED") {
        addNotification(
            $pdo,
            (int)$target_user_id,
            "Account Verified! 🎉",
            "Congratulations! Your organization account has been approved by the Admin. You can now claim available surplus food."
        );
    } else if ($status === "REJECTED") {
        addNotification(
            $pdo,
            (int)$target_user_id,
            "Account Verification Update",
            "Your registration verification could not be approved at this time. Please check your documents or contact support."
        );
    }

    echo json_encode([
        "success" => true,
        "message" => "User verification status updated to " . $status . " successfully."
    ]);

} catch (PDOException $e) {
    error_log("verify-user error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
