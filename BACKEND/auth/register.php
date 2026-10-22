<?php

header("Content-Type: application/json");

require_once "../config/db.php";

try {

    // -----------------------------------------
    // GET INPUT
    // -----------------------------------------

    $role = strtoupper(trim($_POST['role'] ?? ''));

    $email = trim($_POST['email'] ?? '');

    $password = $_POST['password'] ?? '';

    $business_name = trim($_POST['business_name'] ?? '');

    $ngo_name = trim($_POST['ngo_name'] ?? '');

    $contact_person = trim($_POST['contact_person'] ?? '');

    $address = trim($_POST['address'] ?? '');

    $phone = trim($_POST['phone'] ?? '');

    $latitude = $_POST['latitude'] ?? '';

    $longitude = $_POST['longitude'] ?? '';


    // -----------------------------------------
    // ROLE VALIDATION
    // -----------------------------------------

    if (
        $role !== 'DONOR' &&
        $role !== 'RECIPIENT'
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid user role."
        ]);

        exit;
    }


    // -----------------------------------------
    // REQUIRED COMMON FIELDS
    // -----------------------------------------

    if (
        $email === '' ||
        $password === '' ||
        $address === ''
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Please fill all required fields."
        ]);

        exit;
    }


    // -----------------------------------------
    // EMAIL VALIDATION
    // -----------------------------------------

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

        echo json_encode([
            "success" => false,
            "message" => "Please enter a valid email address."
        ]);

        exit;
    }


    // -----------------------------------------
    // PASSWORD VALIDATION
    // -----------------------------------------

    /*
       Password requirements:

       Minimum 6 characters
       At least one lowercase letter
       At least one uppercase letter
       At least one number
       At least one special character
    */

    $passwordRegex =
        '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/';


    if (!preg_match($passwordRegex, $password)) {

        echo json_encode([
            "success" => false,
            "message" => "Password must contain at least 6 characters, including uppercase, lowercase, number and special character."
        ]);

        exit;
    }


    // -----------------------------------------
    // LOCATION VALIDATION
    // -----------------------------------------

    if (
        $latitude === '' ||
        $longitude === ''
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Location is required."
        ]);

        exit;
    }


    // -----------------------------------------
    // CONVERT LOCATION TO NUMBERS
    // -----------------------------------------

    if (
        !is_numeric($latitude) ||
        !is_numeric($longitude)
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid location coordinates."
        ]);

        exit;
    }


    $latitude = (float)$latitude;

    $longitude = (float)$longitude;


    // -----------------------------------------
    // VALID LATITUDE
    // -----------------------------------------

    if (
        $latitude < -90 ||
        $latitude > 90
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid latitude."
        ]);

        exit;
    }


    // -----------------------------------------
    // VALID LONGITUDE
    // -----------------------------------------

    if (
        $longitude < -180 ||
        $longitude > 180
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid longitude."
        ]);

        exit;
    }


    // -----------------------------------------
    // CHECK EMAIL
    // -----------------------------------------

    $checkEmail = $pdo->prepare(
        "SELECT id FROM users WHERE email = ? LIMIT 1"
    );

    $checkEmail->execute([$email]);


    if ($checkEmail->fetch()) {

        echo json_encode([
            "success" => false,
            "message" => "This email is already registered."
        ]);

        exit;
    }


    // -----------------------------------------
    // HASH PASSWORD
    // -----------------------------------------

    $hashedPassword = password_hash(
        $password,
        PASSWORD_DEFAULT
    );


    // -----------------------------------------
    // DONOR REGISTRATION
    // -----------------------------------------

    if ($role === 'DONOR') {

        // Validate donor fields

        if (
            $business_name === '' ||
            $phone === ''
        ) {

            echo json_encode([
                "success" => false,
                "message" => "Business Name and Phone Number are required."
            ]);

            exit;
        }


        // Insert donor

        $sql = "
            INSERT INTO users
            (
                role,
                email,
                password,
                business_name,
                address,
                phone,
                latitude,
                longitude
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        ";


        $stmt = $pdo->prepare($sql);


        $stmt->execute([
            $role,
            $email,
            $hashedPassword,
            $business_name,
            $address,
            $phone,
            $latitude,
            $longitude
        ]);
    }


    // -----------------------------------------
    // RECIPIENT REGISTRATION
    // -----------------------------------------

    else {

        // Validate recipient fields

        if (
            $ngo_name === '' ||
            $contact_person === ''
        ) {

            echo json_encode([
                "success" => false,
                "message" => "NGO Name and Contact Person are required."
            ]);

            exit;
        }


        // Insert recipient

        $sql = "
            INSERT INTO users
            (
                role,
                email,
                password,
                ngo_name,
                contact_person,
                phone,
                address,
                latitude,
                longitude
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        ";


        $stmt = $pdo->prepare($sql);


        $stmt->execute([
            $role,
            $email,
            $hashedPassword,
            $ngo_name,
            $contact_person,
            $phone !== '' ? $phone : null,
            $address,
            $latitude,
            $longitude
        ]);
    }


    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------

    echo json_encode([
        "success" => true,
        "message" => "Registration successful!"
    ]);

} catch (PDOException $e) {

    // -----------------------------------------
    // LOG REAL DATABASE ERROR
    // -----------------------------------------

    error_log(
        "Registration database error: " .
        $e->getMessage()
    );


    // -----------------------------------------
    // SAFE MESSAGE FOR USER
    // -----------------------------------------

    echo json_encode([
        "success" => false,
        "message" => "Unable to complete registration right now. Please try again later."
    ]);
}

?>