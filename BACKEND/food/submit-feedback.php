<?php
header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../notifications/notify-helper.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

try {
    $recipientId = $_POST["recipient_id"] ?? null;
    $foodId = $_POST["food_id"] ?? null;
    $rating = $_POST["rating"] ?? null;
    $comment = trim($_POST["comment"] ?? "");

    // Validate inputs
    if (empty($recipientId) || empty($foodId) || empty($rating)) {
        echo json_encode([
            "success" => false,
            "message" => "Recipient ID, Food ID, and a rating are required."
        ]);
        exit;
    }

    $recipientId = (int) $recipientId;
    $foodId = (int) $foodId;
    $rating = (int) $rating;

    if ($rating < 1 || $rating > 5) {
        echo json_encode([
            "success" => false,
            "message" => "Rating must be between 1 and 5 stars."
        ]);
        exit;
    }

    // Verify recipient user
    $userStmt = $pdo->prepare("SELECT id, role, ngo_name FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$recipientId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || strtoupper($user["role"]) !== "RECIPIENT") {
        echo json_encode([
            "success" => false,
            "message" => "Only registered recipients can submit feedback."
        ]);
        exit;
    }

    // Verify food listing
    $foodStmt = $pdo->prepare("
        SELECT id, donor_id, food_title, status, claimed_by 
        FROM food_listings 
        WHERE id = ? 
        LIMIT 1
    ");
    $foodStmt->execute([$foodId]);
    $food = $foodStmt->fetch(PDO::FETCH_ASSOC);

    if (!$food) {
        echo json_encode([
            "success" => false,
            "message" => "Food listing not found."
        ]);
        exit;
    }

    if ($food["status"] !== "DELIVERED") {
        echo json_encode([
            "success" => false,
            "message" => "Feedback can only be submitted after the food has been marked as delivered."
        ]);
        exit;
    }

    if ((int) $food["claimed_by"] !== $recipientId) {
        echo json_encode([
            "success" => false,
            "message" => "You can only submit feedback for food donations you have claimed and received."
        ]);
        exit;
    }

    // Check for duplicate feedback
    $checkStmt = $pdo->prepare("SELECT id FROM feedback WHERE food_id = ? AND recipient_id = ? LIMIT 1");
    $checkStmt->execute([$foodId, $recipientId]);
    if ($checkStmt->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "You have already submitted feedback for this food donation."
        ]);
        exit;
    }

    // Insert feedback
    $insertStmt = $pdo->prepare("
        INSERT INTO feedback (food_id, recipient_id, donor_id, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $insertStmt->execute([
        $foodId,
        $recipientId,
        (int) $food["donor_id"],
        $rating,
        $comment ?: null
    ]);

    // Send notification to donor
    $recipientName = $user["ngo_name"] ?: "A recipient";
    $notifTitle = "New Feedback Received";
    $notifMsg = "{$recipientName} gave a {$rating}-star rating for your donation '{$food['food_title']}'.";
    addNotification($pdo, $food["donor_id"], $notifTitle, $notifMsg);

    echo json_encode([
        "success" => true,
        "message" => "Thank you! Your feedback has been submitted successfully."
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
