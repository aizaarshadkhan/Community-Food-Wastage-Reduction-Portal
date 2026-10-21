$(document).ready(function () {
    // ==========================================
    // CHECK LOGGED-IN USER
    // ==========================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    // Only donors can access Add Food
    if (!userId || !role || role.toUpperCase() !== "DONOR") {

        alert("Please login as a donor first.");

        window.location.href = "login.html";

        return;
    }

    // ==========================================
    // LOCATION
    // ==========================================
    $("#locationButton").click(function () {
        const message = $("#locationMessage");
        if (!navigator.geolocation) {
            message
                .text("Geolocation is not supported by your browser.")
                .removeClass()
                .addClass("d-block mt-2 text-danger");
            return;
        }

        message
            .text("Getting your location...")
            .removeClass()
            .addClass("d-block mt-2 text-primary");
        navigator.geolocation.getCurrentPosition(
            function (position) {
                $("#latitude").val(
                    position.coords.latitude.toFixed(8)
                );
                $("#longitude").val(
                    position.coords.longitude.toFixed(8)
                );
                message
                    .text("Location added successfully.")
                    .removeClass()
                    .addClass("d-block mt-2 text-success");
            },
            function () {
                message
                    .text("Unable to get your location. Please allow location access.")
                    .removeClass()
                    .addClass("d-block mt-2 text-danger");
            }
        );
    });

    // ==========================================
    // PREVENT EXPIRY DATE FROM BEING IN THE PAST
    // ==========================================
    const expiryInput = $("#expiry");
    const now = new Date();

    now.setMinutes(
        now.getMinutes() - now.getTimezoneOffset()
    );
    expiryInput.attr(
        "min",
        now.toISOString().slice(0, 16)
    );

    // ==========================================
    // FOOD FORM
    // ==========================================
    $("#foodForm").submit(function (e) {
        e.preventDefault();
        $.ajax({
            url: "BACKEND/food/add-food.php",
            type: "POST",
            data: {
                // USE LOGGED-IN DONOR ID
                donor_id: userId,
                food_title:
                    $("#foodTitle").val().trim(),
                category:
                    $("#category").val(),
                quantity:
                    $("#quantity").val(),
                pickup_address:
                    $("#pickupAddress").val().trim(),
                latitude:
                    $("#latitude").val(),
                longitude:
                    $("#longitude").val(),
                expiry_datetime:
                    $("#expiry").val().replace("T", " ")
            },

            // ==================================
            // SUCCESS
            // ==================================
            success: function (response) {
                console.log("ADD FOOD RESPONSE:");
                console.log(response);
                if (response.success) {
                    alert(
                        "Food added successfully!"
                    );
                    // Clear form
                    $("#foodForm")[0].reset();
                    // Clear location
                    $("#latitude").val("");
                    $("#longitude").val("");
                    $("#locationMessage").text("");
                    // Return to donor dashboard
                    window.location.href =
                        "donor-dashboard.html";

                }
                else {
                    alert(
                        "Error: " +
                        response.message
                    );
                }
            },

            // ==================================
            // ERROR
            // ==================================
            error: function (xhr) {
                console.log("PHP ERROR:");
                console.log(xhr.responseText);
                alert(
                    "Something went wrong. Check the browser console."
                );
            }
        });
    });
});