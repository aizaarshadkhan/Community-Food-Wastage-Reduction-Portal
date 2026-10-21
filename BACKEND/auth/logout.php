<?php

session_start();

header("Content-Type: application/json");

// Remove all session variables
$_SESSION = [];

// Destroy the session
session_destroy();

echo json_encode([
    "success" => true,
    "message" => "Logout successful."
]);

?>