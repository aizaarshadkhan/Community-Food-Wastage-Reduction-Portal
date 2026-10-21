<?php

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // ==========================================
    // GET RECIPIENT ID
    // ==========================================

    $recipientId = $_GET["recipient_id"] ?? null;


    if (!$recipientId) {

        echo json_encode([
            "success" => false,
            "message" => "Recipient ID is required."
        ]);

        exit;
    }


    $recipientId = (int) $recipientId;


    if ($recipientId <= 0) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid recipient ID."
        ]);

        exit;
    }


    // ==========================================
    // GET RECIPIENT PROFILE
    // ==========================================

    $stmt = $pdo->prepare("
        SELECT
            id,
            role,
            email,
            ngo_name,
            contact_person,
            address,
            phone,
            latitude,
            longitude,
            created_at
        FROM users
        WHERE id = ?
        AND role = 'RECIPIENT'
        LIMIT 1
    ");

    $stmt->execute([$recipientId]);

    $recipient = $stmt->fetch(PDO::FETCH_ASSOC);


    // ==========================================
    // RECIPIENT NOT FOUND
    // ==========================================

    if (!$recipient) {

        echo json_encode([
            "success" => false,
            "message" => "Recipient profile not found."
        ]);

        exit;
    }


    // ==========================================
    // SUCCESS
    // ==========================================

    echo json_encode([

        "success" => true,

        "profile" => $recipient

    ]);


} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" => "Database error while loading profile."

    ]);

}

?>