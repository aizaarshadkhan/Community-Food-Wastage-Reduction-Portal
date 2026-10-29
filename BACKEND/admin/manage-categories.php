<?php
/**
 * manage-categories.php - Admin Food Category Management API
 * 
 * Functional Requirements Handled:
 * - Admin Side: Management of food categories (Create & Delete).
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method."]);
    exit;
}

try {
    $admin_id = $_POST["admin_id"] ?? null;
    $action = $_POST["action"] ?? "ADD"; // "ADD" or "DELETE"

    // 1. Authorize Admin
    if (!$admin_id) {
        echo json_encode(["success" => false, "message" => "Admin ID is required."]);
        exit;
    }

    $adminCheck = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'ADMIN' LIMIT 1");
    $adminCheck->execute([(int)$admin_id]);
    if (!$adminCheck->fetch()) {
        echo json_encode(["success" => false, "message" => "Unauthorized. Admin privileges required."]);
        exit;
    }

    // 2. Handle Actions
    if ($action === "ADD") {
        $name = trim($_POST["name"] ?? "");
        $code = strtoupper(trim($_POST["code"] ?? ""));

        if (empty($name) || empty($code)) {
            echo json_encode(["success" => false, "message" => "Category Name and Code are required."]);
            exit;
        }

        // Clean code format (letters, numbers, underscore only)
        $code = preg_replace("/[^A-Z0-9_]/", "_", $code);

        $stmt = $pdo->prepare("INSERT INTO food_categories (name, code) VALUES (?, ?)");
        $stmt->execute([$name, $code]);

        echo json_encode([
            "success" => true,
            "message" => "New category '{$name}' created successfully.",
            "category" => [
                "id" => $pdo->lastInsertId(),
                "name" => $name,
                "code" => $code
            ]
        ]);

    } else if ($action === "DELETE") {
        $categoryId = (int)($_POST["category_id"] ?? 0);
        if ($categoryId <= 0) {
            echo json_encode(["success" => false, "message" => "Valid Category ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM food_categories WHERE id = ?");
        $stmt->execute([$categoryId]);

        echo json_encode([
            "success" => true,
            "message" => "Food category deleted successfully."
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Unrecognized category action."]);
    }

} catch (PDOException $e) {
    if ($e->getCode() === "23000") {
        echo json_encode(["success" => false, "message" => "A category with this name or code already exists."]);
        exit;
    }
    error_log("manage-categories error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
