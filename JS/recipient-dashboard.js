/**
 * recipient-dashboard.js - Recipient Dashboard Frontend Logic
 * 
 * Functional Requirements Handled:
 * 1. User Management & Verification Banner:
 *    - Displays warning if NGO account is pending Admin verification.
 *    - Disables claim buttons while pending.
 * 2. Interactive Map / Search:
 *    - Renders Leaflet map centered on recipient's location with search radius circle.
 *    - Plots available food donations with markers and interactive claim popups.
 *    - Filters food by distance (5, 10, 25 km) and keyword search.
 * 3. Claiming System:
 *    - Allows verified recipients to claim surplus food in 1-click.
 * 4. Status Tracking:
 *    - Tracks claims from CLAIMED to DELIVERED.
 *    - Allows recipient to mark / confirm delivery.
 * 5. Feedback & Rating:
 *    - Allows recipient to submit quality & hygiene ratings (1-5 stars) for delivered food.
 */

$(document).ready(function () {
    // ============================================================
    // 1. AUTHENTICATION & SESSION CHECK
    // ============================================================
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "RECIPIENT") {
        alert("Please login as a recipient first.");
        window.location.href = "login.html";
        return;
    }

    let availableFood = [];
    let recipientCoords = null;
    let map = null;
    let markersLayer = null;
    let radiusCircle = null;
    let isVerified = false;

    // Initialize Feedback Bootstrap Modal
    let feedbackModalInstance = null;
    const feedbackModalEl = document.getElementById("feedbackModal");
    if (feedbackModalEl && typeof bootstrap !== "undefined") {
        feedbackModalInstance = new bootstrap.Modal(feedbackModalEl);
    }

    // ============================================================
    // 2. LEAFLET INTERACTIVE MAP INITIALIZATION
    // ============================================================
    function initMap(lat, lng, radiusKm) {
        if (!map) {
            // Create map centered on recipient
            map = L.map("recipientMap").setView([lat, lng], 13);

            // OpenStreetMap tile layer
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            // Layer group for dynamic food markers
            markersLayer = L.layerGroup().addTo(map);

            // Custom pin for recipient location
            const recipientIcon = L.divIcon({
                className: "custom-recipient-marker",
                html: '<div style="background:#0d6efd;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;"><i class="bi bi-person-fill" style="font-size:18px;"></i></div>',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            });

            L.marker([lat, lng], { icon: recipientIcon })
                .addTo(map)
                .bindPopup("<strong>Your Organization</strong><br>Center of your search area.")
                .openPopup();
        }

        // Update or draw the search radius circle
        if (radiusCircle) {
            map.removeLayer(radiusCircle);
        }
        radiusCircle = L.circle([lat, lng], {
            color: "#0d6efd",
            fillColor: "#0d6efd",
            fillOpacity: 0.08,
            radius: radiusKm * 1000 // Convert km to meters
        }).addTo(map);
    }

    // Update food markers on the map
    function updateMapMarkers(foodList) {
        if (!markersLayer || !map) return;
        markersLayer.clearLayers();

        const foodIcon = L.divIcon({
            className: "custom-food-marker",
            html: '<div style="background:#198754;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;"><i class="bi bi-basket2-fill" style="font-size:16px;"></i></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        foodList.forEach(function (food) {
            if (food.latitude && food.longitude) {
                const lat = parseFloat(food.latitude);
                const lng = parseFloat(food.longitude);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const popupContent = `
                        <div style="min-width: 180px;">
                            <strong style="font-size: 14px; color: #198754;">${escapeHtml(food.food_title)}</strong>
                            <div class="small text-muted mb-1">${escapeHtml(food.category)} &bull; ${escapeHtml(food.quantity)}</div>
                            <div class="small mb-1"><i class="bi bi-geo-alt"></i> ${escapeHtml(food.pickup_address)}</div>
                            <div class="small mb-2"><strong>${escapeHtml(food.distance_km)} km</strong> away</div>
                            ${isVerified ? `
                                <button type="button" class="btn btn-sm btn-success w-100 claim-food-btn" data-food-id="${food.id}">
                                    <i class="bi bi-hand-thumbs-up"></i> Claim This Food
                                </button>
                            ` : `
                                <span class="badge bg-warning text-dark w-100 py-1">Pending Verification</span>
                            `}
                        </div>
                    `;

                    L.marker([lat, lng], { icon: foodIcon })
                        .addTo(markersLayer)
                        .bindPopup(popupContent);
                }
            }
        });
    }

    // ============================================================
    // 3. LOAD AVAILABLE FOOD & RECIPIENT PROFILE
    // ============================================================
    function loadAvailableFood() {
        $("#foodLoading").show();
        const selectedRadius = parseFloat($("#radiusFilter").val()) || 10;

        $.ajax({
            url: "BACKEND/food/available-food.php",
            type: "GET",
            data: {
                recipient_id: userId,
                radius: selectedRadius
            },
            dataType: "json",
            success: function (response) {
                $("#foodLoading").hide();

                if (!response.success) {
                    $("#foodGrid").html(`
                        <div class="col-12">
                            <div class="alert alert-warning">
                                <i class="bi bi-info-circle me-2"></i>${escapeHtml(response.message)}
                            </div>
                        </div>
                    `);
                    return;
                }

                // Verification check
                const status = (response.verification_status || "PENDING").toUpperCase();
                isVerified = (status === "VERIFIED");

                if (!isVerified) {
                    $("#verificationAlert").removeClass("d-none").addClass("d-flex");
                } else {
                    $("#verificationAlert").addClass("d-none").removeClass("d-flex");
                }

                // Initialize interactive map with recipient location
                if (response.recipient && response.recipient.latitude && response.recipient.longitude) {
                    recipientCoords = {
                        lat: parseFloat(response.recipient.latitude),
                        lng: parseFloat(response.recipient.longitude)
                    };
                    initMap(recipientCoords.lat, recipientCoords.lng, selectedRadius);
                }

                availableFood = response.food || [];
                $("#availableCount").text(availableFood.length);

                // Render grid cards and map pins
                displayFood(availableFood);
                updateMapMarkers(availableFood);
            },
            error: function (xhr) {
                $("#foodLoading").hide();
                console.error("available-food error:", xhr.responseText);
                $("#foodGrid").html(`
                    <div class="col-12">
                        <div class="alert alert-danger">
                            Unable to connect to the server to load nearby food.
                        </div>
                    </div>
                `);
            }
        });
    }

    // ============================================================
    // 4. DISPLAY FOOD CARDS
    // ============================================================
    function displayFood(foodList) {
        const foodGrid = $("#foodGrid");
        foodGrid.empty();

        if (!foodList || foodList.length === 0) {
            foodGrid.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-basket2 mb-3" style="font-size: 45px; color: #6c757d;"></i>
                        <h5>No Food Available Nearby</h5>
                        <p class="text-muted">There are currently no surplus food donations listed within this radius.</p>
                    </div>
                </div>
            `);
            return;
        }

        foodList.forEach(function (food) {
            const expiryText = formatDate(food.expiry_datetime);
            const isVeg = (food.category === "VEG");
            const categoryBadge = isVeg 
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-circle-fill me-1" style="font-size: 8px;"></i>Veg</span>'
                : `<span class="badge bg-light text-dark border">${escapeHtml(food.category)}</span>`;

            // Food photo or placeholder
            const imageHtml = food.image
                ? `<img src="${escapeHtml(food.image)}" class="card-img-top" style="height: 180px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;" alt="${escapeHtml(food.food_title)}">`
                : `<div class="d-flex align-items-center justify-content-center bg-light text-success" style="height: 140px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                     <i class="bi bi-basket2" style="font-size: 48px; opacity: 0.6;"></i>
                   </div>`;

            // Claim button (active if verified, disabled with notice if pending)
            const claimBtnHtml = isVerified
                ? `<button type="button" class="btn btn-primary w-100 claim-food-btn" data-food-id="${food.id}">
                     <i class="bi bi-hand-thumbs-up me-1"></i> Claim Food
                   </button>`
                : `<button type="button" class="btn btn-secondary w-100" disabled title="Pending Admin verification">
                     <i class="bi bi-shield-lock me-1"></i> Verification Pending
                   </button>`;

            foodGrid.append(`
                <div class="col-12 col-md-6 col-xl-4 food-item">
                    <div class="card h-100 shadow-sm border-0">
                        ${imageHtml}
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0 fw-bold">${escapeHtml(food.food_title)}</h5>
                                ${categoryBadge}
                            </div>

                            <p class="text-muted mb-1 small">
                                <i class="bi bi-shop me-1 text-secondary"></i> Donor: <strong>${escapeHtml(food.donor_name || "Food Donor")}</strong>
                            </p>
                            <p class="text-muted mb-1 small">
                                <i class="bi bi-box me-1 text-secondary"></i> Quantity: <strong>${escapeHtml(food.quantity)}</strong>
                            </p>
                            <p class="text-muted mb-1 small">
                                <i class="bi bi-geo-alt me-1 text-secondary"></i> ${escapeHtml(food.pickup_address)}
                            </p>
                            <p class="text-muted mb-2 small">
                                <i class="bi bi-signpost-2 me-1 text-secondary"></i> <strong>${escapeHtml(food.distance_km)}</strong> km away
                            </p>
                            <p class="text-danger mb-3 small fw-semibold">
                                <i class="bi bi-clock me-1"></i> Best Before: ${expiryText}
                            </p>

                            <div class="mt-auto">
                                ${claimBtnHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    // ============================================================
    // 5. SEARCH & RADIUS FILTER
    // ============================================================
    function filterFood() {
        const searchText = $("#foodSearch").val().trim().toLowerCase();

        if (searchText === "") {
            displayFood(availableFood);
            updateMapMarkers(availableFood);
            return;
        }

        const filtered = availableFood.filter(function (food) {
            const title = String(food.food_title || "").toLowerCase();
            const cat = String(food.category || "").toLowerCase();
            const addr = String(food.pickup_address || "").toLowerCase();
            return title.includes(searchText) || cat.includes(searchText) || addr.includes(searchText);
        });

        displayFood(filtered);
        updateMapMarkers(filtered);
    }

    $("#searchBtn").click(filterFood);
    $("#foodSearch").on("keyup", filterFood);
    $("#radiusFilter").on("change", function () {
        loadAvailableFood();
    });

    // ============================================================
    // 6. CLAIM FOOD ACTION
    // ============================================================
    $(document).on("click", ".claim-food-btn", function () {
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        if (!isVerified) {
            alert("Your NGO account is pending Admin verification. You cannot claim food until approved.");
            return;
        }

        if (!confirm("Are you sure you want to reserve this food donation for pickup?")) {
            return;
        }

        const button = $(this);
        const originalText = button.html();
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Claiming...');

        $.ajax({
            url: "BACKEND/food/claim-food.php",
            type: "POST",
            data: {
                food_id: foodId,
                recipient_id: userId
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert(res.message);
                    loadAvailableFood();
                    loadMyClaims();
                } else {
                    alert(res.message || "Failed to claim food.");
                    button.prop("disabled", false).html(originalText);
                }
            },
            error: function (xhr) {
                console.error("claim-food error:", xhr.responseText);
                alert("Server error occurred while claiming food.");
                button.prop("disabled", false).html(originalText);
            }
        });
    });

    // ============================================================
    // 7. LOAD MY CLAIMS & STATUS TRACKING
    // ============================================================
    function loadMyClaims() {
        $("#claimsLoading").show();

        $.ajax({
            url: "BACKEND/food/recipient-claims.php",
            type: "GET",
            data: { recipient_id: userId },
            dataType: "json",
            success: function (response) {
                $("#claimsLoading").hide();

                if (!response.success) {
                    $("#claimsGrid").html(`
                        <div class="col-12">
                            <div class="alert alert-danger">${escapeHtml(response.message || "Unable to load claims.")}</div>
                        </div>
                    `);
                    return;
                }

                const claims = response.claims || [];
                if (response.stats) {
                    $("#claimedCount").text(response.stats.claimed || 0);
                    $("#deliveredCount").text(response.stats.delivered || 0);
                }

                displayClaims(claims);
            },
            error: function (xhr) {
                $("#claimsLoading").hide();
                console.error("recipient-claims error:", xhr.responseText);
                $("#claimsGrid").html(`
                    <div class="col-12">
                        <div class="alert alert-danger">Unable to load your claims history.</div>
                    </div>
                `);
            }
        });
    }

    // ============================================================
    // 8. DISPLAY CLAIMS (STATUS CONFIRMATION & FEEDBACK)
    // ============================================================
    function displayClaims(claims) {
        const claimsGrid = $("#claimsGrid");
        claimsGrid.empty();

        if (!claims || claims.length === 0) {
            claimsGrid.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-hand-thumbs-up" style="font-size: 45px; color: #6c757d;"></i>
                        <h5 class="mt-3">No Claims Yet</h5>
                        <p class="text-muted">Food you reserve and pick up will be tracked here.</p>
                    </div>
                </div>
            `);
            return;
        }

        claims.forEach(function (claim) {
            const status = String(claim.status || "CLAIMED").toUpperCase();
            let statusBadge = "bg-primary";
            if (status === "DELIVERED") statusBadge = "bg-success";

            const imageHtml = claim.image
                ? `<img src="${escapeHtml(claim.image)}" class="card-img-top" style="height: 150px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;" alt="${escapeHtml(claim.food_title)}">`
                : "";

            // Actions block based on status workflow:
            // If CLAIMED: Recipient can confirm delivery when collected!
            // If DELIVERED: Recipient can provide quality rating & feedback.
            let actionBlockHtml = "";
            if (status === "CLAIMED") {
                actionBlockHtml = `
                    <button type="button" class="btn btn-outline-success btn-sm w-100 mt-3 confirm-delivered-btn" 
                        data-food-id="${claim.food_id}" 
                        data-food-title="${escapeHtml(claim.food_title)}">
                        <i class="bi bi-check2-circle me-1"></i> Confirm Food Received (Delivered)
                    </button>
                `;
            } else if (status === "DELIVERED") {
                if (claim.feedback_rating) {
                    const stars = "⭐".repeat(Number(claim.feedback_rating));
                    actionBlockHtml = `
                        <div class="mt-3 p-2 bg-light rounded border">
                            <div class="small fw-bold text-warning">${stars} ${claim.feedback_rating}/5 Rated</div>
                            ${claim.feedback_comment ? `<div class="small text-muted fst-italic mt-1">"${escapeHtml(claim.feedback_comment)}"</div>` : ''}
                        </div>
                    `;
                } else {
                    actionBlockHtml = `
                        <button type="button" class="btn btn-outline-primary btn-sm w-100 mt-3 open-feedback-modal-btn" 
                            data-food-id="${claim.food_id}" 
                            data-food-title="${escapeHtml(claim.food_title)}">
                            <i class="bi bi-star me-1"></i> Rate Quality & Hygiene
                        </button>
                    `;
                }
            }

            claimsGrid.append(`
                <div class="col-12 col-md-6 col-xl-4">
                    <div class="card h-100 shadow-sm border-0">
                        ${imageHtml}
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0 fw-bold">${escapeHtml(claim.food_title || "Food Listing")}</h5>
                                <span class="badge ${statusBadge}">${escapeHtml(status)}</span>
                            </div>

                            <p class="text-muted mb-1 small">
                                <i class="bi bi-box me-1"></i> Quantity: <strong>${escapeHtml(claim.quantity ?? "N/A")}</strong>
                            </p>
                            <p class="text-muted mb-1 small">
                                <i class="bi bi-geo-alt me-1"></i> ${escapeHtml(claim.pickup_address || "-")}
                            </p>
                            <p class="text-muted mb-1 small">
                                <i class="bi bi-clock me-1"></i> Claimed: ${formatDate(claim.claimed_at)}
                            </p>
                            ${claim.delivered_at ? `
                                <p class="text-success mb-1 small fw-semibold">
                                    <i class="bi bi-check-circle me-1"></i> Delivered: ${formatDate(claim.delivered_at)}
                                </p>
                            ` : ""}

                            <div class="mt-auto">
                                ${actionBlockHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    // ============================================================
    // 9. CONFIRM DELIVERED ACTION (Status Tracking Workflow)
    // ============================================================
    $(document).on("click", ".confirm-delivered-btn", function () {
        const foodId = $(this).data("food-id");
        const title = $(this).data("food-title");

        if (!confirm(`Have you picked up and received "${title}"? This will mark the listing as DELIVERED.`)) {
            return;
        }

        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Confirming...');

        $.ajax({
            url: "BACKEND/food/mark-delivered.php",
            type: "POST",
            data: {
                food_id: foodId,
                recipient_id: userId
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert(res.message);
                    loadMyClaims();
                } else {
                    alert("Error: " + res.message);
                    btn.prop("disabled", false).html('<i class="bi bi-check2-circle me-1"></i> Confirm Food Received');
                }
            },
            error: function (xhr) {
                console.error("mark-delivered error:", xhr.responseText);
                alert("Server error while updating delivery status.");
                btn.prop("disabled", false).html('<i class="bi bi-check2-circle me-1"></i> Confirm Food Received');
            }
        });
    });

    // ============================================================
    // 10. FEEDBACK & QUALITY RATING MODAL
    // ============================================================
    $(document).on("click", ".open-feedback-modal-btn", function () {
        const foodId = $(this).data("food-id");
        const foodTitle = $(this).data("food-title");

        $("#feedbackFoodId").val(foodId);
        $("#feedbackFoodTitle").text(foodTitle);
        $("#feedbackRating").val("");
        $("#feedbackComment").val("");

        if (feedbackModalInstance) {
            feedbackModalInstance.show();
        } else {
            $("#feedbackModal").modal("show");
        }
    });

    $("#submitFeedbackBtn").click(function () {
        const foodId = $("#feedbackFoodId").val();
        const rating = $("#feedbackRating").val();
        const comment = $("#feedbackComment").val().trim();

        if (!rating) {
            alert("Please select a star rating (1 to 5).");
            return;
        }

        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Submitting...');

        $.ajax({
            url: "BACKEND/food/submit-feedback.php",
            type: "POST",
            data: {
                recipient_id: userId,
                food_id: foodId,
                rating: rating,
                comment: comment
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert(res.message);
                    if (feedbackModalInstance) {
                        feedbackModalInstance.hide();
                    } else {
                        $("#feedbackModal").modal("hide");
                    }
                    loadMyClaims();
                } else {
                    alert("Error: " + res.message);
                }
            },
            error: function (xhr) {
                console.error("Feedback error:", xhr.responseText);
                alert("Server error while submitting feedback.");
            },
            complete: function () {
                btn.prop("disabled", false).html('<i class="bi bi-send me-1"></i> Submit Feedback');
            }
        });
    });

    // ============================================================
    // 11. HELPERS & INITIALIZATION
    // ============================================================
    function formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(String(dateString).replace(" ", "T"));
        if (isNaN(date.getTime())) return escapeHtml(dateString);
        return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    }

    function escapeHtml(value) {
        return $("<div>").text(value ?? "").html();
    }

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });

    // Initial data load
    loadAvailableFood();
    loadMyClaims();
});
