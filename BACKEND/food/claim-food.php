<?php
/**
 * claim-food.php - Atomic Food Claiming API
 * 
 * Requirements Handled:
 * - Claiming System: Reserves surplus food atomically, preventing race conditions or double claims.
 * - User Management: Checks that only VERIFIED recipients can claim food donations.
 * - Notification Engine: Generates notification alerts for donor and recipient.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

try {
    // 1. Validate Input Parameters
    $foodId = $_POST["food_id"] ?? null;
    $recipientId = $_POST["recipient_id"] ?? null;

    if (!$foodId || !$recipientId || (int)$foodId <= 0 || (int)$recipientId <= 0) {
        echo json_encode(["success" => false, "message" => "Food ID and Recipient ID are required."]);
        exit;
    }

    $foodId = (int)$foodId;
    $recipientId = (int)$recipientId;

    // 2. Verify Recipient Role and Admin Verification Status
    $recipientStmt = $pdo->prepare("
        SELECT id, role, ngo_name, verification_status
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $recipientStmt->execute([$recipientId]);
    $recipient = $recipientStmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient || strtoupper($recipient["role"]) !== "RECIPIENT") {
        echo json_encode(["success" => false, "message" => "Only registered recipients can claim food donations."]);
        exit;
    }

    // Enforce Admin Verification Check
    $verificationStatus = strtoupper(trim($recipient["verification_status"] ?? "PENDING"));
    if ($verificationStatus === "PENDING") {
        echo json_encode([
            "success" => false,
            "message" => "Your NGO account is currently pending Admin verification. You cannot claim food until your verification is approved."
        ]);
        exit;
    }

    if ($verificationStatus === "REJECTED") {
        echo json_encode([
            "success" => false,
            "message" => "Your NGO account verification was rejected. Please contact the platform administrator."
        ]);
        exit;
    }

    // 3. Begin Transaction with Row-Level Lock (Pessimistic Locking to prevent double claims)
    $pdo->beginTransaction();

    $foodStmt = $pdo->prepare("
        SELECT id, donor_id, food_title, pickup_address, status, expiry_datetime, claimed_by
        FROM food_listings
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
    ");
    $foodStmt->execute([$foodId]);
    $food = $foodStmt->fetch(PDO::FETCH_ASSOC);

    if (!$food) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Food listing not found."]);
        exit;
    }

    $status = strtoupper($food["status"]);
    $expiry = $food["expiry_datetime"];

    // Check if food has already passed expiry time
    $isExpired = (
        !$expiry ||
        $expiry === "0000-00-00 00:00:00" ||
        strtotime($expiry) === false ||
        strtotime($expiry) <= time()
    );

    if ($status === "EXPIRED" || ($status === "AVAILABLE" && $isExpired)) {
        if ($status === "AVAILABLE") {
            $expireStmt = $pdo->prepare("UPDATE food_listings SET status = 'EXPIRED' WHERE id = ?");
            $expireStmt->execute([$foodId]);
            $pdo->commit();
        } else {
            $pdo->rollBack();
        }
        echo json_encode(["success" => false, "message" => "This food donation has expired and cannot be claimed."]);
        exit;
    }

    if ($status !== "AVAILABLE") {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "This food is no longer available. It may have already been claimed."]);
        exit;
    }

    // 4. Create Claim Record in food_claims table
    $claimStmt = $pdo->prepare("
        INSERT INTO food_claims (food_id, recipient_id, claimed_at)
        VALUES (?, ?, NOW())
    ");
    $claimStmt->execute([$foodId, $recipientId]);

    // 5. Update Food Status to CLAIMED
    $updateStmt = $pdo->prepare("
        UPDATE food_listings
        SET status = 'CLAIMED', claimed_by = ?
        WHERE id = ? AND status = 'AVAILABLE'
    ");
    $updateStmt->execute([$recipientId, $foodId]);

    if ($updateStmt->rowCount() !== 1) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Food could not be claimed. It was already claimed by another organization."]);
        exit;
    }

    // Commit Transaction
    $pdo->commit();

    // 6. Send in-app Notification Engine Alerts
    $recipientName = $recipient["ngo_name"] ?: "A recipient organization";
    $foodTitle = $food["food_title"];

    addNotification(
        $pdo,
        $food["donor_id"],
        "Food Claimed!",
        "{$recipientName} has claimed your donation '{$foodTitle}'. Please coordinate the pickup at {$food['pickup_address']}."
    );

    addNotification(
        $pdo,
        $recipientId,
        "Claim Successful!",
        "You have claimed '{$foodTitle}'. Pickup Address: {$food['pickup_address']}."
    );

    echo json_encode([
        "success" => true,
        "message" => "Food claimed successfully! Pickup details added to My Claims.",
        "claim" => [
            "food_id" => $foodId,
            "recipient_id" => $recipientId,
            "status" => "CLAIMED"
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("claim-food error: " . $e->getMessage());

    if ($e->getCode() === "23000") {
        echo json_encode(["success" => false, "message" => "This food has already been claimed."]);
        exit;
    }

    echo json_encode(["success" => false, "message" => "Server error while processing food claim."]);
}
?>
