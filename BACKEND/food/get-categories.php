<?php
/**
 * get-categories.php - Food Categories API
 * 
 * Functional Requirements Handled:
 * - Admin Side: Management of food categories.
 * - Donation Listing: Dynamically provides available food categories for Add Food and Edit Food forms.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";

try {
    $stmt = $pdo->query("SELECT id, name, code FROM food_categories ORDER BY id ASC");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fallback seed categories if table is empty
    if (empty($categories)) {
        $categories = [
            ["id" => 1, "name" => "Vegetarian", "code" => "VEG"],
            ["id" => 2, "name" => "Non-Vegetarian", "code" => "NON_VEG"],
            ["id" => 3, "name" => "Bakery & Breads", "code" => "BAKERY"],
            ["id" => 4, "name" => "Cooked Meals", "code" => "COOKED"],
            ["id" => 5, "name" => "Packaged & Dry Groceries", "code" => "GROCERY"]
        ];
    }

    echo json_encode([
        "success" => true,
        "categories" => $categories
    ]);

} catch (PDOException $e) {
    error_log("get-categories error: " . $e->getMessage());
    echo json_encode([
        "success" => true,
        "categories" => [
            ["id" => 1, "name" => "Vegetarian", "code" => "VEG"],
            ["id" => 2, "name" => "Non-Vegetarian", "code" => "NON_VEG"]
        ]
    ]);
}
?>
