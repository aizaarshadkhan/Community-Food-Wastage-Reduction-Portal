/**
 * script1.js - Add Food Frontend Logic
 * 
 * Functional Requirements Handled:
 * 1. Dynamic Categories: Loads categories dynamically from BACKEND/food/get-categories.php managed by Admin.
 * 2. Food Image Upload: Validates file type, size (5MB), and displays instant image preview.
 * 3. Interactive Leaflet Map: Pins GPS coordinates via click, address geocoding search, or browser geolocation.
 * 4. Submission & Notification Engine: Submits multipart form data to add-food.php.
 */

$(document).ready(function () {
    // 1. Session & Role Check (Only Donors can access)
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "DONOR") {
        alert("Please login as a donor first.");
        window.location.href = "login.html";
        return;
    }

    // 2. Load Dynamic Categories from Database (Admin Managed)
    function loadCategories() {
        $.ajax({
            url: "BACKEND/food/get-categories.php",
            type: "GET",
            dataType: "json",
            success: function (res) {
                if (res.success && Array.isArray(res.categories) && res.categories.length > 0) {
                    const select = $("#category");
                    select.empty();
                    select.append('<option value="">Select Category</option>');
                    res.categories.forEach(function (cat) {
                        select.append(`<option value="${cat.code}">${cat.name}</option>`);
                    });
                }
            },
            error: function (err) {
                console.error("Failed to load dynamic categories:", err);
            }
        });
    }
    loadCategories();

    // 3. Food Image Preview
    $("#foodImage").on("change", function () {
        const file = this.files[0];
        if (file) {
            const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
            if (!validTypes.includes(file.type)) {
                alert("Please select a valid image file (JPG, PNG, WEBP).");
                $(this).val("");
                $("#imagePreviewContainer").addClass("d-none");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert("Image file size must be less than 5MB.");
                $(this).val("");
                $("#imagePreviewContainer").addClass("d-none");
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                $("#imagePreview").attr("src", e.target.result);
                $("#imagePreviewContainer").removeClass("d-none");
            };
            reader.readAsDataURL(file);
        } else {
            $("#imagePreviewContainer").addClass("d-none");
            $("#imagePreview").attr("src", "");
        }
    });

    // 4. Leaflet Map Setup
    let defaultLat = 24.8607;
    let defaultLng = 67.0011;
    let map = null;
    let marker = null;

    if ($("#pickupMap").length && typeof L !== "undefined") {
        try {
            map = L.map("pickupMap").setView([defaultLat, defaultLng], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            map.on("click", function (e) {
                setCoordinates(e.latlng.lat, e.latlng.lng);
            });
        } catch (err) {
            console.error("Leaflet map initialization failed:", err);
        }
    }

    function setCoordinates(lat, lng) {
        const fixedLat = Number(lat).toFixed(8);
        const fixedLng = Number(lng).toFixed(8);

        $("#latitude").val(fixedLat);
        $("#longitude").val(fixedLng);

        if (map) {
            if (marker) {
                marker.setLatLng([lat, lng]);
            } else {
                marker = L.marker([lat, lng]).addTo(map);
            }
            map.panTo([lat, lng]);
        }

        $("#locationMessage")
            .text("Location selected (" + fixedLat + ", " + fixedLng + ").")
            .removeClass()
            .addClass("d-block mt-2 text-success");
    }

    // 5. Address Search on Map (Nominatim Geocoding)
    $("#searchAddressBtn").click(function () {
        const query = $("#addressSearch").val().trim();
        const message = $("#addressSearchMessage");

        if (!query) {
            message.text("Please enter an address or place to search.").removeClass().addClass("d-block mt-2 text-danger");
            return;
        }

        message.text("Searching location...").removeClass().addClass("d-block mt-2 text-primary");

        fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query))
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const place = data[0];
                    const lat = parseFloat(place.lat);
                    const lon = parseFloat(place.lon);

                    setCoordinates(lat, lon);
                    if (map) {
                        map.setView([lat, lon], 15);
                    }

                    message.text("Location pinned on map: " + place.display_name).removeClass().addClass("d-block mt-2 text-success");
                    if (!$("#pickupAddress").val().trim()) {
                        $("#pickupAddress").val(place.display_name);
                    }
                } else {
                    message.text("No results found. Please try a different query or click directly on the map.").removeClass().addClass("d-block mt-2 text-warning");
                }
            })
            .catch(err => {
                console.error("Address search error:", err);
                message.text("Unable to search address. Please click your location directly on the map.").removeClass().addClass("d-block mt-2 text-danger");
            });
    });

    $("#addressSearch").keypress(function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $("#searchAddressBtn").click();
        }
    });

    // 6. Use My GPS Location Button
    $("#locationButton").click(function () {
        const message = $("#locationMessage");
        if (!navigator.geolocation) {
            message.text("Geolocation is not supported by your browser.").removeClass().addClass("d-block mt-2 text-danger");
            return;
        }

        message.text("Getting your location...").removeClass().addClass("d-block mt-2 text-primary");

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCoordinates(lat, lng);
                if (map) {
                    map.setView([lat, lng], 15);
                }
                message.text("Your location has been added successfully.").removeClass().addClass("d-block mt-2 text-success");
            },
            function () {
                message.text("Unable to get your location. Please allow location access or click on the map.").removeClass().addClass("d-block mt-2 text-danger");
            }
        );
    });

    // 7. Prevent Expiry Date from Being in the Past
    const expiryInput = $("#expiry");
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    expiryInput.attr("min", now.toISOString().slice(0, 16));

    // 8. Add Food Form Submission
    $("#foodForm").submit(function (e) {
        e.preventDefault();

        const title = $("#foodTitle").val().trim();
        const category = $("#category").val();
        const quantity = $("#quantity").val();
        const pickupAddress = $("#pickupAddress").val().trim();
        const latitude = $("#latitude").val();
        const longitude = $("#longitude").val();
        const expiry = $("#expiry").val();

        if (!title || !category || !quantity || !pickupAddress || !latitude || !longitude || !expiry) {
            alert("Please fill in all required fields and select a pickup location.");
            return;
        }

        const expiryDate = new Date(expiry);
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
            alert("Expiry date and time must be in the future.");
            return;
        }

        const submitBtn = $("#submitFoodBtn");
        submitBtn.prop("disabled", true).html('<i class="bi bi-hourglass-split"></i> Adding Food...');

        const formData = new FormData();
        formData.append("donor_id", userId);
        formData.append("food_title", title);
        formData.append("category", category);
        formData.append("quantity", quantity);
        formData.append("pickup_address", pickupAddress);
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("expiry_datetime", expiry.replace("T", " "));

        const imageInput = $("#foodImage")[0];
        if (imageInput && imageInput.files.length > 0) {
            formData.append("food_image", imageInput.files[0]);
        }

        $.ajax({
            url: "BACKEND/food/add-food.php",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    alert("Food listing added successfully!");
                    $("#foodForm")[0].reset();
                    $("#latitude").val("");
                    $("#longitude").val("");
                    $("#imagePreviewContainer").addClass("d-none");
                    $("#locationMessage").text("");
                    if (marker && map) {
                        map.removeLayer(marker);
                        marker = null;
                    }
                    window.location.href = "donor-dashboard.html";
                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function (xhr) {
                console.error("ADD FOOD PHP ERROR:", xhr.responseText);
                alert("Something went wrong. Please check your connection and try again.");
            },
            complete: function () {
                submitBtn.prop("disabled", false).html('<i class="bi bi-send"></i> Add Food Listing');
            }
        });
    });

    // 9. Logout
    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });
});
