<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";

try {

    // ==========================================
    // GET DONOR ID
    // ==========================================

    $donorId = $_GET["donor_id"] ?? null;


    if (!$donorId) {

        echo json_encode([
            "success" => false,
            "message" => "Donor ID is required."
        ]);

        exit;
    }


    $donorId = (int) $donorId;


    // ==========================================
    // GET DONOR PROFILE
    // ==========================================

    $stmt = $pdo->prepare("
        SELECT
            id,
            role,
            email,
            business_name,
            address,
            phone,
            latitude,
            longitude,
            created_at
        FROM users
        WHERE id = ?
        AND role = 'DONOR'
        LIMIT 1
    ");


    $stmt->execute([$donorId]);


    $donor = $stmt->fetch(PDO::FETCH_ASSOC);


    // ==========================================
    // CHECK DONOR
    // ==========================================

    if (!$donor) {

        echo json_encode([
            "success" => false,
            "message" => "Donor profile not found."
        ]);

        exit;
    }


    // ==========================================
    // SUCCESS
    // ==========================================

    echo json_encode([

        "success" => true,

        "profile" => $donor

    ]);


} catch (PDOException $e) {

    echo json_encode([

        "success" => false,

        "message" => "Database error."

    ]);

}

?>