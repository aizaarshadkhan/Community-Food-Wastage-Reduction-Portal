<?php
header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    $userId = $_GET["user_id"] ?? null;

    if (!$userId) {
        echo json_encode([
            "success" => false,
            "message" => "User ID is required."
        ]);
        exit;
    }

    $userId = (int) $userId;

    // Get unread count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $countStmt->execute([$userId]);
    $unreadCount = (int) $countStmt->fetchColumn();

    // Get latest 20 notifications
    $stmt = $pdo->prepare("
        SELECT id, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "unread_count" => $unreadCount,
        "notifications" => $notifications
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
