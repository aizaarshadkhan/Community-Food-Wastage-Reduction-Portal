<?php
/**
 * recipient-claims.php - API to fetch a recipient's claims history and pickup metrics
 * 
 * Functional Requirements Handled:
 * - Claiming System: Tracks reservations made by the recipient.
 * - Status Tracking: Shows workflow from CLAIMED to DELIVERED.
 * - Feedback & Rating: Includes any existing feedback or provides hooks to submit feedback.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    // 1. Validate Recipient ID
    $recipientId = $_GET["recipient_id"] ?? null;
    if (!$recipientId || (int)$recipientId <= 0) {
        echo json_encode(["success" => false, "message" => "Recipient ID is required."]);
        exit;
    }
    $recipientId = (int)$recipientId;

    // 2. Verify Recipient Role
    $userStmt = $pdo->prepare("SELECT id, role, ngo_name FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$recipientId]);
    $recipient = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient || strtoupper($recipient["role"]) !== "RECIPIENT") {
        echo json_encode(["success" => false, "message" => "Invalid recipient user."]);
        exit;
    }

    // 3. Fetch Claims History with Food Details and Feedback
    $claimStmt = $pdo->prepare("
        SELECT
            fc.id AS claim_id,
            fc.food_id,
            fc.recipient_id,
            fc.claimed_at,
            fc.delivered_at,
            fl.donor_id,
            fl.food_title,
            fl.category,
            fl.quantity,
            fl.image,
            fl.pickup_address,
            fl.latitude,
            fl.longitude,
            fl.expiry_datetime,
            fl.status,
            u.business_name AS donor_name,
            u.phone AS donor_phone,
            fb.id AS feedback_id,
            fb.rating AS feedback_rating,
            fb.comment AS feedback_comment
        FROM food_claims fc
        INNER JOIN food_listings fl ON fc.food_id = fl.id
        LEFT JOIN users u ON fl.donor_id = u.id
        LEFT JOIN feedback fb ON fb.food_id = fl.id AND fb.recipient_id = fc.recipient_id
        WHERE fc.recipient_id = ?
        ORDER BY fc.claimed_at DESC
    ");
    $claimStmt->execute([$recipientId]);
    $claims = $claimStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Compute Summary Statistics for the Recipient Dashboard
    $statsStmt = $pdo->prepare("
        SELECT
            COALESCE(SUM(CASE WHEN fl.status = 'CLAIMED' THEN 1 ELSE 0 END), 0) AS claimed,
            COALESCE(SUM(CASE WHEN fl.status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS delivered,
            COALESCE(SUM(CASE WHEN fl.status = 'DELIVERED' THEN fl.quantity ELSE 0 END), 0) AS total_kg_received
        FROM food_claims fc
        INNER JOIN food_listings fl ON fc.food_id = fl.id
        WHERE fc.recipient_id = ?
    ");
    $statsStmt->execute([$recipientId]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "recipient" => $recipient["ngo_name"],
        "stats" => [
            "claimed" => (int)$stats["claimed"],
            "delivered" => (int)$stats["delivered"],
            "total_kg_received" => (float)$stats["total_kg_received"]
        ],
        "claims" => $claims
    ]);

} catch (PDOException $e) {
    error_log("recipient-claims error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Database error while fetching recipient claims."
    ]);
}
?>
