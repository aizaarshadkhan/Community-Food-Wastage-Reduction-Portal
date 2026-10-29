/**
 * script.js - Authentication & Global Scripts for MealBridge
 * Handles:
 * 1. User Login with role-based redirection (Donor, Recipient, Admin)
 * 2. Role-specific Registration (Donor vs Recipient with NGO Document Upload)
 * 3. Browser GPS Geolocation capture
 * 4. Remember-me credential caching
 */

$(document).ready(function () {
    // ============================================================
    // 1. REMEMBER ME (LOGIN CACHE)
    // ============================================================
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
        $("#email").val(savedEmail);
        $("#remember-me").prop("checked", true);
    }

    // ============================================================
    // 2. USER LOGIN HANDLER
    // ============================================================
    $(".login-button").click(function (e) {
        e.preventDefault();

        const email = $("#email").val().trim();
        const password = $("#password").val();

        $("#loginError").addClass("d-none").text("");
        $("#emailError").text("");
        $("#passwordError").text("");

        // Basic validation
        if (email === "") {
            $("#loginError").removeClass("d-none").text("Please enter your email and password.");
            return;
        }
        if (password === "") {
            $("#loginError").removeClass("d-none").text("Please enter your email and password.");
            return;
        }

        // Send login credentials to backend
        $.ajax({
            url: "BACKEND/auth/login.php",
            type: "POST",
            data: {
                email: email,
                password: password
            },
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    // Remember me preference
                    if ($("#remember-me").is(":checked")) {
                        localStorage.setItem("remembered_email", email);
                    } else {
                        localStorage.removeItem("remembered_email");
                    }

                    // Save session details in browser storage
                    localStorage.setItem("user_id", response.user.id);
                    localStorage.setItem("role", response.user.role.toUpperCase());
                    localStorage.setItem("email", response.user.email);
                    if (response.user.verification_status) {
                        localStorage.setItem("verification_status", response.user.verification_status);
                    }

                    // Redirect user based on assigned role
                    const role = response.user.role.toUpperCase();
                    if (role === "DONOR") {
                        window.location.href = "donor-dashboard.html";
                    } else if (role === "RECIPIENT") {
                        window.location.href = "recipient-dashboard.html";
                    } else if (role === "ADMIN") {
                        window.location.href = "admin-dashboard.html";
                    } else {
                        $("#loginError").removeClass("d-none").text("Unrecognized user role.");
                    }
                } else {
                    $("#loginError").removeClass("d-none").text(response.message || "Invalid credentials.");
                }
            },
            error: function (xhr) {
                console.error("Login AJAX error:", xhr.responseText);
                $("#loginError").removeClass("d-none").text("Unable to connect to the server. Please try again.");
            }
        });
    });

    // ============================================================
    // 3. RESPONSIVE MOBILE NAVIGATION TOGGLE
    // ============================================================
    $(".nav-btn").click(function () {
        $("nav ul").stop().slideToggle(300);
    });

    $(window).resize(function () {
        if ($(window).width() > 768) {
            $("nav ul").removeAttr("style");
        }
    });

    // ============================================================
    // 4. REGISTRATION PAGE ROLE SWITCH (DONOR VS RECIPIENT)
    // ============================================================
    let selectedRole = "DONOR";

    $(".role-btn").click(function () {
        $(".role-btn").removeClass("active");
        $(this).addClass("active");
        selectedRole = $(this).data("role");

        if (selectedRole === "DONOR") {
            $("#donorFields").show();
            $("#recipientFields").hide();
            // Clear recipient fields
            $("#ngoName").val("");
            $("#contactPerson").val("");
            $("#recipientPhone").val("");
            $("#ngoDoc").val("");
            $("#ngoNameError").text("");
            $("#contactPersonError").text("");
            $("#recipientPhoneError").text("");
            $("#ngoDocError").text("");
        } else {
            $("#donorFields").hide();
            $("#recipientFields").show();
            // Clear donor fields
            $("#businessName").val("");
            $("#phone").val("");
            $("#businessNameError").text("");
            $("#phoneError").text("");
        }
    });

    // ============================================================
    // 5. GPS LOCATION CAPTURE
    // ============================================================
    $("#locationButton").click(function () {
        $("#locationError").removeClass("success error").text("");

        if (!navigator.geolocation) {
            $("#locationError").addClass("error").text("Geolocation is not supported by your browser.");
            return;
        }

        $("#locationButton").prop("disabled", true).html('<i class="fa-solid fa-spinner fa-spin"></i> Getting GPS...');

        navigator.geolocation.getCurrentPosition(
            function (position) {
                $("#latitude").val(position.coords.latitude);
                $("#longitude").val(position.coords.longitude);
                $("#locationButton").prop("disabled", false).html('<i class="fa-solid fa-check"></i> Location Captured');
                $("#locationError").removeClass("error").addClass("success").text("GPS coordinates successfully pinned.");
            },
            function (error) {
                $("#locationButton").prop("disabled", false).html('<i class="fa-solid fa-location-dot"></i> Use My GPS Location');
                $("#locationError").addClass("error").text("Could not retrieve GPS location. Please allow location access.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    // ============================================================
    // 6. REGISTRATION SUBMIT HANDLER (Supports Multipart Form Data)
    // ============================================================
    $(".register-button").click(function (e) {
        e.preventDefault();

        const businessName = $("#businessName").val().trim();
        const phone = $("#phone").val().trim();
        const ngoName = $("#ngoName").val().trim();
        const contactPerson = $("#contactPerson").val().trim();
        const recipientPhone = $("#recipientPhone").val().trim();
        const email = $("#email").val().trim();
        const address = $("#address").val().trim();
        const latitude = $("#latitude").val().trim();
        const longitude = $("#longitude").val().trim();
        const password = $("#password").val();
        const confirmPassword = $("#confirm-password").val();
        const docFile = $("#ngoDoc")[0] ? $("#ngoDoc")[0].files[0] : null;

        // Validation regular expressions
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        let isValid = true;
        $(".error").text("");
        $(".register-success").removeClass("success error").text("");

        // Role-specific validation
        if (selectedRole === "DONOR") {
            if (businessName === "") {
                $("#businessNameError").text("Business Name is required");
                isValid = false;
            }
            if (phone === "") {
                $("#phoneError").text("Phone Number is required");
                isValid = false;
            }
        } else {
            if (ngoName === "") {
                $("#ngoNameError").text("NGO Name is required");
                isValid = false;
            }
            if (contactPerson === "") {
                $("#contactPersonError").text("Contact Person is required");
                isValid = false;
            }
            if (recipientPhone === "") {
                $("#recipientPhoneError").text("Phone Number is required");
                isValid = false;
            }
            if (!docFile) {
                $("#ngoDocError").text("Verification document (certificate/ID) is required for NGOs.");
                isValid = false;
            }
        }

        // Common fields validation
        if (email === "") {
            $("#emailError").text("Email is required");
            isValid = false;
        } else if (!emailRegex.test(email)) {
            $("#emailError").text("Please enter a valid email address");
            isValid = false;
        }

        if (address === "") {
            $("#addressError").text("Address is required");
            isValid = false;
        }

        if (latitude === "" || longitude === "") {
            $("#locationError").addClass("error").text("Please click 'Use My Location' to capture your coordinates.");
            isValid = false;
        }

        if (password === "") {
            $("#passwordError").text("Password is required");
            isValid = false;
        } else if (!passwordRegex.test(password)) {
            $("#passwordError").text("Password must contain uppercase, lowercase, number and special character");
            isValid = false;
        }

        if (confirmPassword === "") {
            $("#confirmPasswordError").text("Confirm Password is required");
            isValid = false;
        } else if (password !== confirmPassword) {
            $("#confirmPasswordError").text("Passwords do not match");
            isValid = false;
        }

        if (!isValid) return;

        // Build FormData to support file upload (verification document)
        const formData = new FormData();
        formData.append("role", selectedRole);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("address", address);
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);

        if (selectedRole === "DONOR") {
            formData.append("business_name", businessName);
            formData.append("phone", phone);
        } else {
            formData.append("ngo_name", ngoName);
            formData.append("contact_person", contactPerson);
            formData.append("phone", recipientPhone);
            if (docFile) {
                formData.append("verification_doc", docFile);
            }
        }

        $(".register-button").prop("disabled", true).text("Registering...");

        // Submit to backend
        $.ajax({
            url: "BACKEND/auth/register.php",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            success: function (response) {
                $(".register-button").prop("disabled", false).text("Register");

                if (response.success) {
                    $(".register-success").removeClass("error").addClass("success").text(response.message).show();
                    // Clear inputs
                    $("#email, #address, #password, #confirm-password, #businessName, #phone, #ngoName, #contactPerson, #recipientPhone, #ngoDoc").val("");
                    setTimeout(function () {
                        window.location.href = "login.html";
                    }, 2000);
                } else {
                    $(".register-success").removeClass("success").addClass("error").text(response.message).show();
                }
            },
            error: function (xhr) {
                $(".register-button").prop("disabled", false).text("Register");
                console.error("Registration error:", xhr.responseText);
                $(".register-success").removeClass("success").addClass("error").text("Server error. Please try again.").show();
            }
        });
    });
});