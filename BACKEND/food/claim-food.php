<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

try {
    // GET POST DATA
    $foodId = $_POST["food_id"] ?? null;
    $recipientId = $_POST["recipient_id"] ?? null;

    // VALIDATE INPUT
    if (!$foodId || !$recipientId) {
        echo json_encode([
            "success" => false,
            "message" => "Food ID and Recipient ID are required."
        ]);
        exit;
    }

    $foodId = (int) $foodId;
    $recipientId = (int) $recipientId;

    if ($foodId <= 0 || $recipientId <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid food or recipient ID."
        ]);
        exit;
    }

    // CHECK RECIPIENT
    $recipientStmt = $pdo->prepare("
        SELECT id, role, ngo_name
        FROM users
        WHERE id = ?
        LIMIT 1
    ");
    $recipientStmt->execute([$recipientId]);
    $recipient = $recipientStmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient) {
        echo json_encode([
            "success" => false,
            "message" => "Recipient not found."
        ]);
        exit;
    }

    if (strtoupper($recipient["role"]) !== "RECIPIENT") {
        echo json_encode([
            "success" => false,
            "message" => "Only recipients can claim food."
        ]);
        exit;
    }

    // START TRANSACTION
    $pdo->beginTransaction();

    // LOCK FOOD ROW
    $foodStmt = $pdo->prepare("
        SELECT
            id,
            donor_id,
            food_title,
            pickup_address,
            status,
            expiry_datetime,
            claimed_by
        FROM food_listings
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
    ");
    $foodStmt->execute([$foodId]);
    $food = $foodStmt->fetch(PDO::FETCH_ASSOC);

    // FOOD NOT FOUND
    if (!$food) {
        $pdo->rollBack();

        echo json_encode([
            "success" => false,
            "message" => "Food listing not found."
        ]);
        exit;
    }

    $status = strtoupper($food["status"]);
    $expiry = $food["expiry_datetime"];

    // CHECK IF ALREADY EXPIRED
    $isExpired = (
        !$expiry ||
        $expiry === "0000-00-00 00:00:00" ||
        strtotime($expiry) === false ||
        strtotime($expiry) <= time()
    );

    if ($status === "EXPIRED") {
        $pdo->rollBack();

        echo json_encode([
            "success" => false,
            "message" => "This food donation has expired."
        ]);
        exit;
    }

    // EXPIRE THE LISTING IF ITS EXPIRY TIME HAS PASSED
    if ($status === "AVAILABLE" && $isExpired) {
        $expireStmt = $pdo->prepare("
            UPDATE food_listings
            SET status = 'EXPIRED'
            WHERE id = ?
              AND status = 'AVAILABLE'
        ");
        $expireStmt->execute([$foodId]);

        $pdo->commit();

        echo json_encode([
            "success" => false,
            "message" => "This food donation has expired."
        ]);
        exit;
    }

    // CHECK STATUS
    if ($status !== "AVAILABLE") {
        $pdo->rollBack();

        echo json_encode([
            "success" => false,
            "message" => "This food is no longer available for claiming."
        ]);
        exit;
    }

    // CREATE CLAIM
    $claimStmt = $pdo->prepare("
        INSERT INTO food_claims (
            food_id,
            recipient_id,
            claimed_at
        )
        VALUES (?, ?, NOW())
    ");
    $claimStmt->execute([$foodId, $recipientId]);

    // UPDATE FOOD STATUS
    $updateStmt = $pdo->prepare("
        UPDATE food_listings
        SET
            status = 'CLAIMED',
            claimed_by = ?
        WHERE id = ?
          AND status = 'AVAILABLE'
    ");
    $updateStmt->execute([$recipientId, $foodId]);

    if ($updateStmt->rowCount() !== 1) {
        $pdo->rollBack();

        echo json_encode([
            "success" => false,
            "message" => "Food could not be claimed. It may have already been claimed."
        ]);
        exit;
    }

    // COMMIT TRANSACTION
    $pdo->commit();

    // Send notifications to donor and recipient
    $recipientName = $recipient["ngo_name"] ?: "A recipient organization";
    $foodTitle = $food["food_title"];
    addNotification(
        $pdo,
        $food["donor_id"],
        "Food Claimed",
        "{$recipientName} has claimed your donation '{$foodTitle}'. Please coordinate the pickup."
    );
    addNotification(
        $pdo,
        $recipientId,
        "Claim Confirmed",
        "You successfully claimed '{$foodTitle}'. Pickup Address: {$food['pickup_address']}."
    );

    echo json_encode([
        "success" => true,
        "message" => "Food claimed successfully.",
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

    error_log("Claim food error: " . $e->getMessage());

    if ($e->getCode() === "23000") {
        echo json_encode([
            "success" => false,
            "message" => "This food has already been claimed."
        ]);
        exit;
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database error while claiming food."
    ]);
}
?>
