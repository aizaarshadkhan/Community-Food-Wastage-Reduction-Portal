$(document).ready(function () {

    /* =========================================
        REMEMBER ME
    ======================================== */

    const savedEmail = localStorage.getItem("remembered_email");

    if (savedEmail) {

        $("#email").val(savedEmail);

        $("#remember-me").prop("checked", true);

    }


    /* =========================================
       LOGIN
    ========================================= */

    $(".login-button").click(function (e) {

        e.preventDefault();

        const email = $("#email").val().trim();
        const password = $("#password").val();

        $("#loginError").addClass("d-none").text("");

        if (email === "" || password === "") {

            $("#loginError")
                .removeClass("d-none")
                .text("Please enter your email and password.");

            return;
        }

        $.ajax({

            url: "BACKEND/auth/login.php",
            type: "POST",

            data: {
                email: email,
                password: password
            },

            dataType: "json",

            success: function (response) {

                console.log("LOGIN RESPONSE:", response);

                if (response.success) {

                    /* =====================================
                        REMEMBER ME
                    ===================================== */

                    if ($("#remember-me").is(":checked")) {

                        localStorage.setItem(
                            "remembered_email",
                            email
                        );

                    } else {

                        localStorage.removeItem(
                            "remembered_email"
                        );

                    }

                    // =====================================
                    // SAVE LOGGED-IN USER
                    // =====================================

                    localStorage.setItem(
                        "user_id",
                        response.user.id
                    );

                    localStorage.setItem(
                        "role",
                        response.user.role.toUpperCase()
                    );

                    localStorage.setItem(
                        "email",
                        response.user.email
                    );


                    console.log(
                        "User ID:",
                        localStorage.getItem("user_id")
                    );

                    console.log(
                        "Role:",
                        localStorage.getItem("role")
                    );


                    // =====================================
                    // REDIRECT BASED ON ROLE
                    // =====================================

                    if (response.user.role.toUpperCase() === "DONOR") {

                        window.location.href =
                            "donor-dashboard.html";

                    }

                    else if (response.user.role.toUpperCase() === "RECIPIENT") {

                        window.location.href =
                            "recipient-dashboard.html";

                    }

                    else {

                        $("#loginError")
                            .removeClass("d-none")
                            .text("Invalid user role.");

                    }

                }

                else {

                    $("#loginError")
                        .removeClass("d-none")
                        .text(response.message);

                }

            },

            error: function (xhr) {

                console.log("LOGIN PHP ERROR:");
                console.log(xhr.responseText);

                $("#loginError")
                    .removeClass("d-none")
                    .text("Something went wrong. Please try again.");

            }

        });

    });



    /* =========================================
       NAVIGATION
       ========================================= */

    $(".nav-btn").click(function () {

        $("nav ul")
            .stop()
            .slideToggle(300);

    });


    $(window).resize(function () {

        if ($(window).width() > 768) {

            $("nav ul").removeAttr("style");

        }

    });



    /* =========================================
       REGISTER PAGE
       ========================================= */

    let selectedRole = "DONOR";



    /* -----------------------------------------
       DONOR / RECIPIENT SWITCH
       ----------------------------------------- */

    $(".role-btn").click(function () {

        $(".role-btn").removeClass("active");

        $(this).addClass("active");

        selectedRole = $(this).data("role");


        /* -------------------------------------
           DONOR
           ------------------------------------- */

        if (selectedRole === "DONOR") {

            $("#donorFields").show();

            $("#recipientFields").hide();


            // Clear recipient fields

            $("#ngoName").val("");

            $("#contactPerson").val("");

            $("#ngoNameError").text("");

            $("#contactPersonError").text("");

        }


        /* -------------------------------------
           RECIPIENT
           ------------------------------------- */

        else {

            $("#donorFields").hide();

            $("#recipientFields").show();


            // Clear donor fields

            $("#businessName").val("");

            $("#phone").val("");

            $("#businessNameError").text("");

            $("#phoneError").text("");

        }

    });



    /* =========================================
       USE MY LOCATION
       ========================================= */

    $("#locationButton").click(function () {

        $("#locationError")
            .removeClass("success error")
            .text("");


        /* -------------------------------------
           CHECK GEOLOCATION SUPPORT
           ------------------------------------- */

        if (!navigator.geolocation) {

            $("#locationError")
                .addClass("error")
                .text(
                    "Geolocation is not supported by your browser."
                );

            return;
        }


        /* -------------------------------------
           SHOW LOADING
           ------------------------------------- */

        $("#locationButton")
            .prop("disabled", true)
            .html(
                '<i class="fa-solid fa-spinner fa-spin"></i> Getting Location...'
            );


        /* -------------------------------------
           GET LOCATION
           ------------------------------------- */

        navigator.geolocation.getCurrentPosition(

            function (position) {

                let latitude =
                    position.coords.latitude;

                let longitude =
                    position.coords.longitude;


                /* -----------------------------
                   SAVE COORDINATES
                   ----------------------------- */

                $("#latitude")
                    .val(latitude);

                $("#longitude")
                    .val(longitude);


                /* -----------------------------
                   UPDATE BUTTON
                   ----------------------------- */

                $("#locationButton")
                    .prop("disabled", false)
                    .html(
                        '<i class="fa-solid fa-location-dot"></i> Location Added'
                    );


                /* -----------------------------
                   SUCCESS MESSAGE
                   ----------------------------- */

                $("#locationError")
                    .removeClass("error")
                    .addClass("success")
                    .text(
                        "Your location has been added successfully."
                    );

            },


            /* ---------------------------------
               LOCATION ERROR
               --------------------------------- */

            function (error) {

                $("#locationButton")
                    .prop("disabled", false)
                    .html(
                        '<i class="fa-solid fa-location-dot"></i> Use My Location'
                    );


                let message =
                    "Unable to get your location.";


                if (error.code === 1) {

                    message =
                        "Location permission was denied.";

                }


                if (error.code === 2) {

                    message =
                        "Your location could not be determined.";

                }


                if (error.code === 3) {

                    message =
                        "Location request timed out.";

                }


                $("#locationError")
                    .removeClass("success")
                    .addClass("error")
                    .text(message);

            }

        );

    });



    /* =========================================
       REGISTER
       ========================================= */

    $(".register-button").click(function (e) {

        e.preventDefault();


        /* -------------------------------------
           GET FORM VALUES
           ------------------------------------- */

        let email =
            $("#email").val().trim();

        let password =
            $("#password").val().trim();

        let confirmPassword =
            $("#confirm-password").val().trim();

        let address =
            $("#address").val().trim();

        let latitude =
            $("#latitude").val();

        let longitude =
            $("#longitude").val();


        let businessName =
            $("#businessName").val().trim();

        let phone =
            $("#phone").val().trim();


        let ngoName =
            $("#ngoName").val().trim();

        let contactPerson =
            $("#contactPerson").val().trim();


        /* -------------------------------------
           REGEX
           ------------------------------------- */

        let emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        let passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;


        let isValid = true;


        /* -------------------------------------
           CLEAR PREVIOUS ERRORS
           ------------------------------------- */

        $(".error").text("");

        $(".register-success")
            .removeClass("success error")
            .text("");



        /* =====================================
           ROLE VALIDATION
           ===================================== */


        /* -------------------------------------
           DONOR
           ------------------------------------- */

        if (selectedRole === "DONOR") {

            if (businessName === "") {

                $("#businessNameError")
                    .text("Business Name is required");

                isValid = false;
            }


            if (phone === "") {

                $("#phoneError")
                    .text("Phone Number is required");

                isValid = false;
            }

        }


        /* -------------------------------------
           RECIPIENT
           ------------------------------------- */

        else {

            if (ngoName === "") {

                $("#ngoNameError")
                    .text("NGO Name is required");

                isValid = false;
            }


            if (contactPerson === "") {

                $("#contactPersonError")
                    .text("Contact Person is required");

                isValid = false;
            }

        }



        /* =====================================
           EMAIL
           ===================================== */

        if (email === "") {

            $("#emailError")
                .text("Email is required");

            isValid = false;

        }

        else if (!emailRegex.test(email)) {

            $("#emailError")
                .text("Invalid Email");

            isValid = false;

        }



        /* =====================================
           ADDRESS
           ===================================== */

        if (address === "") {

            $("#addressError")
                .text("Address is required");

            isValid = false;

        }



        /* =====================================
           LOCATION
           ===================================== */

        if (
            latitude === "" ||
            longitude === ""
        ) {

            $("#locationError")
                .removeClass("success")
                .addClass("error")
                .text(
                    "Please click 'Use My Location'."
                );

            isValid = false;

        }



        /* =====================================
           PASSWORD
           ===================================== */

        if (password === "") {

            $("#passwordError")
                .text("Password is required");

            isValid = false;

        }

        else if (!passwordRegex.test(password)) {

            $("#passwordError")
                .text(
                    "Password must contain uppercase, lowercase, number and special character"
                );

            isValid = false;

        }



        /* =====================================
           CONFIRM PASSWORD
           ===================================== */

        if (confirmPassword === "") {

            $("#confirmPasswordError")
                .text(
                    "Confirm Password is required"
                );

            isValid = false;

        }

        else if (
            password !== confirmPassword
        ) {

            $("#confirmPasswordError")
                .text(
                    "Passwords do not match"
                );

            isValid = false;

        }



        /* =====================================
           STOP IF INVALID
           ===================================== */

        if (!isValid) {

            return;

        }



        /* =====================================
           PREPARE DATA
           ===================================== */

        let formData = {

            role: selectedRole,

            email: email,

            password: password,


            /* -------------------------------
               DONOR DATA
               ------------------------------- */

            business_name:
                selectedRole === "DONOR"
                    ? businessName
                    : "",

            phone:
                selectedRole === "DONOR"
                    ? phone
                    : "",


            /* -------------------------------
               RECIPIENT DATA
               ------------------------------- */

            ngo_name:
                selectedRole === "RECIPIENT"
                    ? ngoName
                    : "",

            contact_person:
                selectedRole === "RECIPIENT"
                    ? contactPerson
                    : "",


            /* -------------------------------
               COMMON DATA
               ------------------------------- */

            address: address,

            latitude: latitude,

            longitude: longitude

        };



        /* =====================================
           DISABLE REGISTER BUTTON
           ===================================== */

        $(".register-button")
            .prop("disabled", true)
            .text("Registering...");



        /* =====================================
           AJAX → register.php
           ===================================== */

        $.ajax({

            url:
                "BACKEND/auth/register.php",

            type: "POST",

            data: formData,

            dataType: "json",


            /* ---------------------------------
               SUCCESS RESPONSE
               --------------------------------- */

            success: function (response) {

                console.log(response);


                if (response.success) {

                    $(".register-success")
                        .removeClass("error")
                        .addClass("success")
                        .text(response.message)
                        .show();


                    /* -------------------------
                       CLEAR FORM
                       ------------------------- */

                    $("#email").val("");

                    $("#address").val("");

                    $("#password").val("");

                    $("#confirm-password").val("");

                    $("#latitude").val("");

                    $("#longitude").val("");


                    $("#businessName").val("");

                    $("#phone").val("");

                    $("#ngoName").val("");

                    $("#contactPerson").val("");


                    /* -------------------------
                       RESET LOCATION BUTTON
                       ------------------------- */

                    $("#locationButton")
                        .prop("disabled", false)
                        .html(
                            '<i class="fa-solid fa-location-dot"></i> Use My Location'
                        );

                }


                else {

                    $(".register-success")
                        .removeClass("success")
                        .addClass("error")
                        .text(response.message)
                        .show();

                }

            },


            /* ---------------------------------
               AJAX ERROR
               --------------------------------- */

            error: function (xhr) {

                console.log(
                    "REGISTER PHP ERROR:"
                );

                console.log(
                    xhr.responseText
                );


                $(".register-success")
                    .removeClass("success")
                    .addClass("error")
                    .text(
                        "Something went wrong. Please try again."
                    )
                    .show();

            },


            /* ---------------------------------
               ENABLE BUTTON AGAIN
               --------------------------------- */

            complete: function () {

                $(".register-button")
                    .prop("disabled", false)
                    .text("Register");

            }

        });

    });



    /* =========================================
       BLOG SLIDER
       ========================================= */

    const slider = $(".slider");

    const card = $(".blog-card");


    /* -----------------------------------------
       CALCULATE SCROLL AMOUNT
       ----------------------------------------- */

    function getScrollAmount() {

        /* Mobile */

        if ($(window).width() <= 768) {

            return card.outerWidth(true);

        }


        /* Tablet */

        if ($(window).width() <= 992) {

            return card.outerWidth(true) * 2;

        }


        /* Desktop */

        return card.outerWidth(true) * 3;

    }



    /* -----------------------------------------
       NEXT BUTTON
       ----------------------------------------- */

    $(".next").click(function () {

        slider.animate({

            scrollLeft:
                slider.scrollLeft() +
                getScrollAmount()

        }, 100);

    });

    /* -----------------------------------------
       PREVIOUS BUTTON
       ----------------------------------------- */
    $(".prev").click(function () {

        slider.animate({

            scrollLeft:
                slider.scrollLeft() -
                getScrollAmount()

        }, 100);

    });

    /* =========================================
   SOCIAL LOGIN BUTTONS
========================================= */

    $("#googleLoginBtn").click(function () {

        alert(
            "Google Login requires Google OAuth configuration."
        );

    });


    $("#appleLoginBtn").click(function () {

        alert(
            "Apple Login requires Apple OAuth configuration."
        );

    });


    $("#facebookLoginBtn").click(function () {

        alert(
            "Facebook Login requires Facebook OAuth configuration."
        );

    });
});