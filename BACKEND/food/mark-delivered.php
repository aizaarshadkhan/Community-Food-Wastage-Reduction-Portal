<?php
/**
 * mark-delivered.php - Delivery Confirmation API
 * 
 * Requirements Handled:
 * - Status Tracking: Provide a real-time workflow to track donation status from "Claimed" to "Delivered".
 * - Recipient Side / Donor Side: Allows either the donor or the claiming recipient to confirm handover.
 * - Feedback System: Unlocks quality & hygiene feedback for the recipient once delivered.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method."]);
    exit;
}

try {
    // 1. Extract IDs (Accepts donor_id, recipient_id, or user_id)
    $food_id = $_POST["food_id"] ?? "";
    $user_id = $_POST["user_id"] ?? $_POST["donor_id"] ?? $_POST["recipient_id"] ?? "";

    if (empty($food_id) || empty($user_id)) {
        echo json_encode(["success" => false, "message" => "Food ID and User ID are required."]);
        exit;
    }

    $food_id = (int)$food_id;
    $user_id = (int)$user_id;

    // 2. Fetch the Food Listing
    $stmt = $pdo->prepare("
        SELECT id, donor_id, food_title, claimed_by, status
        FROM food_listings
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$food_id]);
    $food = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$food) {
        echo json_encode(["success" => false, "message" => "Food listing not found."]);
        exit;
    }

    // 3. Authorize User (Must be either the Donor or the Claiming Recipient)
    $isDonor = ((int)$food["donor_id"] === $user_id);
    $isRecipient = ((int)$food["claimed_by"] === $user_id);

    if (!$isDonor && !$isRecipient) {
        echo json_encode(["success" => false, "message" => "You are not authorized to confirm delivery for this listing."]);
        exit;
    }

    // 4. Validate Status Workflow (Must be CLAIMED to transition to DELIVERED)
    if (strtoupper($food["status"]) !== "CLAIMED") {
        echo json_encode(["success" => false, "message" => "Only claimed food can be marked as delivered."]);
        exit;
    }

    // 5. Update Status in Database with Transaction
    $pdo->beginTransaction();

    $updateSql = "
        UPDATE food_listings
        SET status = 'DELIVERED'
        WHERE id = ? AND status = 'CLAIMED'
    ";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([$food_id]);

    if ($updateStmt->rowCount() > 0) {
        // Update delivered_at timestamp in food_claims table
        $claimUpdateSql = "
            UPDATE food_claims
            SET delivered_at = NOW()
            WHERE food_id = ? AND delivered_at IS NULL
        ";
        $claimUpdateStmt = $pdo->prepare($claimUpdateSql);
        $claimUpdateStmt->execute([$food_id]);

        $pdo->commit();

        // 6. Send Notification Alerts to both parties
        $foodTitle = $food["food_title"];
        if (!empty($food["claimed_by"])) {
            addNotification(
                $pdo,
                $food["claimed_by"],
                "Delivery Confirmed!",
                "Donation '{$foodTitle}' has been marked as delivered. Please share your feedback and hygiene rating."
            );
        }
        if (!empty($food["donor_id"])) {
            addNotification(
                $pdo,
                $food["donor_id"],
                "Food Delivered Successfully!",
                "Donation '{$foodTitle}' has been marked as delivered. Thank you for reducing food waste!"
            );
        }

        echo json_encode([
            "success" => true,
            "message" => "Food donation successfully marked as delivered!"
        ]);
    } else {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Could not update delivery status."]);
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("mark-delivered error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error while updating delivery."]);
}
?>
