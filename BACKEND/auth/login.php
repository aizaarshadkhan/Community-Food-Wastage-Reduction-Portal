<?php
/**
 * login.php - User Login API
 * Validates credentials and returns authenticated user session data
 */

session_start();
header("Content-Type: application/json");
require_once "../config/db.php";

try {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($email === '' || $password === '') {
        echo json_encode(["success" => false, "message" => "Email and password are required."]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email or password."]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT id, role, email, password, business_name, ngo_name, contact_person,
               address, phone, latitude, longitude, verification_doc, verification_status
        FROM users
        WHERE email = ?
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode(["success" => false, "message" => "Invalid email or password."]);
        exit;
    }

    session_regenerate_id(true);

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['logged_in_at'] = time();

    unset($user['password']);

    echo json_encode([
        "success" => true,
        "message" => "Login successful!",
        "user" => $user
    ]);

} catch (PDOException $e) {
    error_log("Login database error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Unable to process login right now. Please try again later."
    ]);
}
?>
