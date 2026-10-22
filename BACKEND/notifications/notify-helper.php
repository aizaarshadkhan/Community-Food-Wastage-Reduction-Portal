<?php
// Notification helper function for MealBridge
// Inserts a system alert for a user

function addNotification($pdo, $userId, $title, $message) {
    try {
        if (!$pdo || empty($userId)) {
            return false;
        }

        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, is_read, created_at) 
            VALUES (?, ?, ?, 0, NOW())
        ");
        return $stmt->execute([(int)$userId, $title, $message]);
    } catch (Exception $e) {
        error_log("Notification insert failed: " . $e->getMessage());
        return false;
    }
}
?>