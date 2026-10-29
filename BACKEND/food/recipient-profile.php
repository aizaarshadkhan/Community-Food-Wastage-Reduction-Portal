<?php
/**
 * recipient-profile.php - Recipient Profile Data API
 * 
 * Functional Requirements Handled:
 * - Returns NGO details, contact person, phone, email, address, coordinates,
 *   verification status, and uploaded verification document.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    $recipientId = $_GET["recipient_id"] ?? null;

    if (!$recipientId || (int)$recipientId <= 0) {
        echo json_encode(["success" => false, "message" => "Valid Recipient ID is required."]);
        exit;
    }

    $recipientId = (int)$recipientId;

    $stmt = $pdo->prepare("
        SELECT
            id, role, email, ngo_name, contact_person,
            address, phone, latitude, longitude,
            verification_doc, verification_status, created_at
        FROM users
        WHERE id = ? AND role = 'RECIPIENT'
        LIMIT 1
    ");
    $stmt->execute([$recipientId]);
    $recipient = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$recipient) {
        echo json_encode(["success" => false, "message" => "Recipient profile not found."]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "profile" => $recipient
    ]);

} catch (PDOException $e) {
    error_log("recipient-profile error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error while fetching profile."]);
}
?>
