/**
 * edit-food.js - Edit Surplus Food Listing
 * 
 * Functional Requirements Handled:
 * - Dynamic Categories: Dynamically loads categories managed by Admin.
 * - Allows donors to update surplus food details (Title, Category, Quantity, Expiry, Address, Location).
 * - Enforces status rule: only AVAILABLE listings can be modified.
 */

$(document).ready(function () {
    // 1. Check Logged-in User
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "DONOR") {
        alert("Please login as a donor first.");
        window.location.href = "login.html";
        return;
    }

    // 2. Extract Food ID from Query Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const foodId = urlParams.get("id");

    if (!foodId) {
        alert("Food listing ID is missing.");
        window.location.href = "my-food.html";
        return;
    }

    // 3. Load Dynamic Categories and Food Details
    function loadCategoriesAndFood() {
        $.ajax({
            url: "BACKEND/food/get-categories.php",
            type: "GET",
            dataType: "json",
            success: function (catRes) {
                if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
                    const select = $("#category");
                    select.empty();
                    select.append('<option value="">Select Category</option>');
                    catRes.categories.forEach(function (cat) {
                        select.append(`<option value="${cat.code}">${cat.name}</option>`);
                    });
                }
                loadFood();
            },
            error: function () {
                loadFood();
            }
        });
    }

    function loadFood() {
        $("#editFoodForm").addClass("loading");

        $.ajax({
            url: "BACKEND/food/donor-food.php",
            type: "GET",
            data: { donor_id: userId },
            dataType: "json",
            success: function (response) {
                if (!response.success || !response.food) {
                    showError(response.message || "Unable to load food listing.");
                    return;
                }

                const food = response.food.find(item => String(item.id) === String(foodId));
                if (!food) {
                    showError("Food listing was not found.");
                    return;
                }

                // Check editable state (Only AVAILABLE listings can be edited)
                if (food.status && food.status.toUpperCase() !== "AVAILABLE") {
                    showError("Only AVAILABLE food listings can be edited.");
                    $("#editFoodForm").find("input, select, textarea, button").prop("disabled", true);
                    return;
                }

                // Populate Form Fields
                $("#foodTitle").val(food.food_title || "");
                $("#category").val(food.category || "");
                $("#quantity").val(food.quantity || "");
                $("#pickupAddress").val(food.pickup_address || "");
                $("#latitude").val(food.latitude || "");
                $("#longitude").val(food.longitude || "");
                updateLocationDisplay(food.latitude, food.longitude);

                if (food.expiry_datetime) {
                    $("#expiryDatetime").val(convertToDatetimeLocal(food.expiry_datetime));
                }

                updateStatus(food.status || "AVAILABLE");
                updatePreview();
            },
            error: function () {
                showError("Unable to load food listing. Please check your network.");
            },
            complete: function () {
                $("#editFoodForm").removeClass("loading");
            }
        });
    }

    // 4. Helper: Format DateTime for datetime-local input
    function convertToDatetimeLocal(dateString) {
        if (!dateString) return "";
        let date = new Date(dateString.replace(" ", "T"));
        if (isNaN(date.getTime())) return "";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function updateStatus(status) {
        const statusElement = $("#currentStatus");
        statusElement.removeClass("available claimed delivered expired");

        if (status === "AVAILABLE") {
            statusElement.addClass("available").text("AVAILABLE");
            $("#statusMessage").text("This listing is open for editing.");
        } else {
            statusElement.text(status);
            $("#statusMessage").text("This listing cannot be edited in its current state.");
        }
    }

    function updateLocationDisplay(lat, lng) {
        $("#latitudeDisplay").text(lat || "-");
        $("#longitudeDisplay").text(lng || "-");
    }

    function updatePreview() {
        $("#previewTitle").text($("#foodTitle").val().trim() || "Food Listing");
        $("#previewCategory").text($("#category").val() || "Category");
        $("#previewQuantity").text($("#quantity").val() || "-");
        $("#previewAddress").text($("#pickupAddress").val().trim() || "-");
    }

    $("#foodTitle, #category, #quantity, #pickupAddress").on("input change", updatePreview);

    // 5. GPS Geolocation Capture
    $("#locationBtn").click(function () {
        if (!navigator.geolocation) {
            showError("Geolocation is not supported by your browser.");
            return;
        }

        const button = $(this);
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Getting Location...');

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                $("#latitude").val(lat);
                $("#longitude").val(lng);
                updateLocationDisplay(lat, lng);

                button.prop("disabled", false).html('<i class="bi bi-check-circle"></i> Location Updated');
                setTimeout(function () {
                    button.html('<i class="bi bi-crosshair"></i> Update My Location');
                }, 2000);
            },
            function () {
                button.prop("disabled", false).html('<i class="bi bi-crosshair"></i> Update My Location');
                showError("Unable to retrieve your GPS location. Please allow location access.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    // 6. Submit Edited Listing
    $("#editFoodForm").submit(function (e) {
        e.preventDefault();
        hideMessages();

        const foodTitle = $("#foodTitle").val().trim();
        const category = $("#category").val();
        const quantity = $("#quantity").val();
        const pickupAddress = $("#pickupAddress").val().trim();
        const latitude = $("#latitude").val();
        const longitude = $("#longitude").val();
        const expiryDatetime = $("#expiryDatetime").val();

        if (!foodTitle || !category || !quantity || !pickupAddress || !latitude || !longitude || !expiryDatetime) {
            showError("Please fill in all required fields.");
            return;
        }

        const expiryDate = new Date(expiryDatetime);
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
            showError("Expiry date and time must be in the future.");
            return;
        }

        const saveButton = $("#saveBtn");
        saveButton.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

        $.ajax({
            url: "BACKEND/food/update-food.php",
            type: "POST",
            data: {
                food_id: foodId,
                donor_id: userId,
                food_title: foodTitle,
                category: category,
                quantity: quantity,
                pickup_address: pickupAddress,
                latitude: latitude,
                longitude: longitude,
                expiry_datetime: expiryDatetime.replace("T", " ")
            },
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    showSuccess(response.message || "Food listing updated successfully.");
                    saveButton.html('<i class="bi bi-check-circle"></i> Saved');
                    setTimeout(function () {
                        window.location.href = "my-food.html";
                    }, 1200);
                } else {
                    showError(response.message || "Unable to update food listing.");
                    saveButton.prop("disabled", false).html('<i class="bi bi-check-lg"></i> Save Changes');
                }
            },
            error: function () {
                showError("Server error while updating listing.");
                saveButton.prop("disabled", false).html('<i class="bi bi-check-lg"></i> Save Changes');
            }
        });
    });

    // 7. Message helpers & Logout
    function showError(message) {
        $("#formSuccess").addClass("d-none").text("");
        $("#formError").removeClass("d-none").text(message);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showSuccess(message) {
        $("#formError").addClass("d-none").text("");
        $("#formSuccess").removeClass("d-none").text(message);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function hideMessages() {
        $("#formError, #formSuccess").addClass("d-none").text("");
    }

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });

    // Initial load
    loadCategoriesAndFood();
});
