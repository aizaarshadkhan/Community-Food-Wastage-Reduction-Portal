<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";


// ==========================================
// CHECK REQUEST METHOD
// ==========================================

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);

    exit;
}


// ==========================================
// GET DATA
// ==========================================

$food_id = $_POST["food_id"] ?? "";
$donor_id = $_POST["donor_id"] ?? "";


// ==========================================
// VALIDATE DATA
// ==========================================

if (empty($food_id) || empty($donor_id)) {

    echo json_encode([
        "success" => false,
        "message" => "Food ID and donor ID are required."
    ]);

    exit;
}


try {

    // ==========================================
    // FIND FOOD LISTING
    // ==========================================

    $sql = "
        SELECT
            id,
            donor_id,
            food_title,
            claimed_by,
            status
        FROM food_listings
        WHERE id = ?
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        $food_id
    ]);

    $food = $stmt->fetch();


    // ==========================================
    // FOOD NOT FOUND
    // ==========================================

    if (!$food) {

        echo json_encode([
            "success" => false,
            "message" => "Food listing not found."
        ]);

        exit;
    }


    // ==========================================
    // CHECK DONOR
    // ==========================================

    if ((int) $food["donor_id"] !== (int) $donor_id) {

        echo json_encode([
            "success" => false,
            "message" => "You are not allowed to update this food listing."
        ]);

        exit;
    }


    // ==========================================
    // CHECK CURRENT STATUS
    // ==========================================

    if ($food["status"] !== "CLAIMED") {

        echo json_encode([
            "success" => false,
            "message" => "Only claimed food can be marked as delivered."
        ]);

        exit;
    }


    // ==========================================
    // UPDATE STATUS WITH TRANSACTION
    // CLAIMED → DELIVERED
    // ==========================================

    $pdo->beginTransaction();

    $updateSql = "
        UPDATE food_listings
        SET status = 'DELIVERED'
        WHERE id = ?
        AND donor_id = ?
        AND status = 'CLAIMED'
    ";

    $updateStmt = $pdo->prepare($updateSql);

    $updateStmt->execute([
        $food_id,
        $donor_id
    ]);


    // ==========================================
    // CHECK UPDATE
    // ==========================================

    if ($updateStmt->rowCount() > 0) {

        // Also update delivered_at timestamp in food_claims table
        $claimUpdateSql = "
            UPDATE food_claims
            SET delivered_at = NOW()
            WHERE food_id = ?
            AND delivered_at IS NULL
        ";
        $claimUpdateStmt = $pdo->prepare($claimUpdateSql);
        $claimUpdateStmt->execute([$food_id]);

        $pdo->commit();

        // Send notifications
        $foodTitle = $food["food_title"];
        if (!empty($food["claimed_by"])) {
            addNotification(
                $pdo,
                $food["claimed_by"],
                "Food Delivered",
                "Your claimed food '{$foodTitle}' has been delivered! Please submit your feedback."
            );
        }
        addNotification(
            $pdo,
            $donor_id,
            "Delivery Confirmed",
            "You marked '{$foodTitle}' as delivered. Thank you for your donation!"
        );

        echo json_encode([
            "success" => true,
            "message" => "Food marked as delivered successfully."
        ]);

    } else {

        $pdo->rollBack();

        echo json_encode([
            "success" => false,
            "message" => "Food status could not be updated."
        ]);
    }


} catch (PDOException $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);

}

?>
