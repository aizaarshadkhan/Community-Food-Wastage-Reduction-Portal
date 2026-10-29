<?php
/**
 * register.php - User Registration API
 * Handles registration for:
 * 1. DONOR (Restaurants, Hotels, Individuals)
 * 2. RECIPIENT (NGOs, Shelters, Volunteers) with Verification Document Upload
 */

header("Content-Type: application/json");
require_once "../config/db.php";

try {
    // Extract inputs
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

    // Validate role
    if ($role !== 'DONOR' && $role !== 'RECIPIENT') {
        echo json_encode(["success" => false, "message" => "Invalid user role."]);
        exit;
    }

    // Validate common required fields
    if ($email === '' || $password === '' || $address === '') {
        echo json_encode(["success" => false, "message" => "Please fill in all required fields."]);
        exit;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Please provide a valid email address."]);
        exit;
    }

    // Password strength check
    $passwordRegex = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/';
    if (!preg_match($passwordRegex, $password)) {
        echo json_encode([
            "success" => false,
            "message" => "Password must contain uppercase, lowercase, number and special character."
        ]);
        exit;
    }

    // Validate GPS Coordinates
    if ($latitude === '' || $longitude === '' || !is_numeric($latitude) || !is_numeric($longitude)) {
        echo json_encode(["success" => false, "message" => "Location is required."]);
        exit;
    }

    $latitude = (float)$latitude;
    $longitude = (float)$longitude;
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        echo json_encode(["success" => false, "message" => "Invalid location coordinates."]);
        exit;
    }

    // Check if email already registered
    $checkEmail = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $checkEmail->execute([$email]);
    if ($checkEmail->fetch()) {
        echo json_encode(["success" => false, "message" => "This email is already registered."]);
        exit;
    }

    // Hash the password securely
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    $verification_doc = null;
    $verification_status = 'PENDING';

    if ($role === 'DONOR') {
        if ($business_name === '' || $phone === '') {
            echo json_encode(["success" => false, "message" => "Business Name and Phone Number are required."]);
            exit;
        }
        $verification_status = 'VERIFIED';
    } else {
        if ($ngo_name === '' || $contact_person === '' || $phone === '') {
            echo json_encode(["success" => false, "message" => "NGO Name, Contact Person, and Phone Number are required."]);
            exit;
        }

        // Handle Verification Document upload
        if (isset($_FILES['verification_doc']) && $_FILES['verification_doc']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['verification_doc'];
            $allowedExts = ['pdf', 'png', 'jpg', 'jpeg'];
            $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if (!in_array($fileExt, $allowedExts)) {
                echo json_encode(["success" => false, "message" => "Document must be a PDF, PNG, or JPG file."]);
                exit;
            }

            if ($file['size'] > 10 * 1024 * 1024) {
                echo json_encode(["success" => false, "message" => "Verification document must not exceed 10MB."]);
                exit;
            }

            $uploadDir = __DIR__ . "/../../UPLOADS/documents/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $uniqueName = "doc_" . time() . "_" . bin2hex(random_bytes(6)) . "." . $fileExt;
            $targetPath = $uploadDir . $uniqueName;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $verification_doc = $uniqueName;
            } else {
                echo json_encode(["success" => false, "message" => "Failed to upload verification document."]);
                exit;
            }
        }
        $verification_status = 'PENDING';
    }

    // Insert user record
    $sql = "
        INSERT INTO users (
            role, email, password, business_name, ngo_name, contact_person,
            phone, address, latitude, longitude, verification_doc, verification_status
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $role,
        $email,
        $hashedPassword,
        $role === 'DONOR' ? $business_name : null,
        $role === 'RECIPIENT' ? $ngo_name : null,
        $role === 'RECIPIENT' ? $contact_person : null,
        $phone,
        $address,
        $latitude,
        $longitude,
        $verification_doc,
        $verification_status
    ]);

    $newUserId = $pdo->lastInsertId();

    // Welcome notification
    $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    if ($role === 'RECIPIENT') {
        $notifStmt->execute([
            $newUserId,
            "Welcome to MealBridge!",
            "Your NGO account has been submitted for Admin verification. You can browse nearby listings while verification is in progress."
        ]);
    } else {
        $notifStmt->execute([
            $newUserId,
            "Welcome to MealBridge!",
            "Thank you for registering as a food donor. You can now post surplus food to help people in need."
        ]);
    }

    echo json_encode([
        "success" => true,
        "message" => "Registration successful! " . ($role === 'RECIPIENT' ? "Your account is submitted for Admin verification." : "")
    ]);

} catch (PDOException $e) {
    error_log("Registration error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Registration failed: " . $e->getMessage()]);
}
?>
