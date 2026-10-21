<?php

session_start();

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // -----------------------------------------
    // GET INPUT
    // -----------------------------------------

    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';


    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------

    if ($email === '' || $password === '') {

        echo json_encode([
            "success" => false,
            "message" => "Email and password are required."
        ]);

        exit;
    }


    // -----------------------------------------
    // EMAIL VALIDATION
    // -----------------------------------------

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);

        exit;
    }


    // -----------------------------------------
    // FIND USER
    // -----------------------------------------

    $stmt = $pdo->prepare("
        SELECT
            id,
            role,
            email,
            password,
            business_name,
            ngo_name,
            contact_person,
            address,
            phone,
            latitude,
            longitude
        FROM users
        WHERE email = ?
        LIMIT 1
    ");

    $stmt->execute([$email]);

    $user = $stmt->fetch();


    // -----------------------------------------
    // USER NOT FOUND
    // -----------------------------------------

    if (!$user) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);

        exit;
    }


    // -----------------------------------------
    // VERIFY PASSWORD
    // -----------------------------------------

    if (!password_verify($password, $user['password'])) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);

        exit;
    }


    // -----------------------------------------
    // SECURITY:
    // REGENERATE SESSION ID AFTER LOGIN
    // -----------------------------------------

    session_regenerate_id(true);


    // -----------------------------------------
    // STORE AUTHENTICATED USER IN SESSION
    // -----------------------------------------

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['email'] = $user['email'];


    // -----------------------------------------
    // OPTIONAL:
    // STORE LOGIN TIME
    // -----------------------------------------

    $_SESSION['logged_in_at'] = time();


    // -----------------------------------------
    // REMOVE PASSWORD
    // -----------------------------------------

    unset($user['password']);


    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------

    echo json_encode([
        "success" => true,
        "message" => "Login successful!",
        "user" => $user
    ]);

} catch (PDOException $e) {

    // Log the real error on the server
    error_log("Login database error: " . $e->getMessage());


    // Show only a safe message to the user
    echo json_encode([
        "success" => false,
        "message" => "Unable to process login right now. Please try again later."
    ]);
}

?>