$(document).ready(function () {

    // ==========================================
    // GET LOGGED-IN USER
    // ==========================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    console.log("Logged-in User ID:", userId);
    console.log("Logged-in Role:", role);


    // ==========================================
    // CHECK RECIPIENT LOGIN
    // ==========================================

    if (!userId || !role || role.toUpperCase() !== "RECIPIENT") {
        alert("Please login as a recipient first.");
        window.location.href = "login.html";
        return;
    }


    // ==========================================
    // STORE AVAILABLE FOOD
    // ==========================================

    let availableFood = [];
    let feedbackModalInstance = null;
    const feedbackModalEl = document.getElementById("feedbackModal");
    if (feedbackModalEl && typeof bootstrap !== "undefined") {
        feedbackModalInstance = new bootstrap.Modal(feedbackModalEl);
    }


    // ==========================================
    // LOAD AVAILABLE FOOD
    // ==========================================

    function loadAvailableFood() {

        $("#foodLoading").show();

        $.ajax({
            url: "BACKEND/food/available-food.php",
            type: "GET",
            data: {
                recipient_id: userId,
                radius: $("#radiusFilter").val()
            },
            dataType: "json",

            success: function (response) {
                console.log("AVAILABLE FOOD RESPONSE:", response);
                $("#foodLoading").hide();

                if (!response.success) {
                    $("#foodGrid").html(`
                        <div class="col-12">
                            <div class="alert alert-danger">
                                ${escapeHtml(response.message)}
                            </div>
                        </div>
                    `);
                    return;
                }

                availableFood = response.food || [];

                // Update available food count
                $("#availableCount").text(availableFood.length);

                // Display food
                displayFood(availableFood);
            },

            error: function (xhr) {
                $("#foodLoading").hide();
                console.error("AVAILABLE FOOD PHP ERROR:", xhr.responseText);

                $("#foodGrid").html(`
                    <div class="col-12">
                        <div class="alert alert-danger">
                            Unable to load available food.
                        </div>
                    </div>
                `);
            }
        });
    }


    // ==========================================
    // DISPLAY FOOD (WITH IMAGE SUPPORT)
    // ==========================================

    function displayFood(foodList) {

        const foodGrid = $("#foodGrid");
        foodGrid.empty();

        // No food available
        if (!foodList || foodList.length === 0) {
            foodGrid.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-basket2 mb-3" style="font-size: 45px; color: #6c757d;"></i>
                        <h5>No food available</h5>
                        <p class="text-muted">
                            There are currently no available food donations within this radius.
                        </p>
                    </div>
                </div>
            `);
            return;
        }

        // Create food cards
        foodList.forEach(function (food) {

            const expiryText = formatDate(food.expiry_datetime);
            const categoryText = food.category === "NON_VEG" ? "Non-Veg" : "Veg";
            const categoryClass = food.category === "NON_VEG" ? "text-danger" : "text-success";

            // Food image banner or category icon placeholder
            const imageHtml = food.image
                ? `<img src="${escapeHtml(food.image)}" class="card-img-top" style="height: 180px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;" alt="${escapeHtml(food.food_title)}">`
                : `<div class="d-flex align-items-center justify-content-center bg-light text-success" style="height: 140px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                     <i class="bi bi-basket2" style="font-size: 48px; opacity: 0.6;"></i>
                   </div>`;

            foodGrid.append(`
                <div class="col-12 col-md-6 col-xl-4 food-item">
                    <div class="card h-100 shadow-sm border-0">
                        ${imageHtml}
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title mb-0">
                                    ${escapeHtml(food.food_title)}
                                </h5>
                                <span class="${categoryClass} fw-semibold">
                                    <i class="bi bi-circle-fill" style="font-size: 10px;"></i>
                                    ${categoryText}
                                </span>
                            </div>

                            <p class="text-muted mb-2">
                                <i class="bi bi-box me-1"></i>
                                Quantity:
                                <strong>${escapeHtml(food.quantity)}</strong>
                            </p>

                            <p class="text-muted mb-2">
                                <i class="bi bi-geo-alt me-1"></i>
                                ${escapeHtml(food.pickup_address)}
                            </p>

                            <p class="text-muted mb-2">
                                <i class="bi bi-signpost-2 me-1"></i>
                                <strong>${escapeHtml(food.distance_km)}</strong> km away
                            </p>

                            <p class="text-muted mb-3">
                                <i class="bi bi-clock me-1"></i>
                                Expires: ${expiryText}
                            </p>

                            <button
                                type="button"
                                class="btn btn-primary w-100 claim-food-btn"
                                data-food-id="${food.id}"
                            >
                                <i class="bi bi-hand-thumbs-up me-1"></i>
                                Claim Food
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });
    }


    // ==========================================
    // SEARCH FOOD
    // ==========================================

    function searchFood() {
        const searchText = $("#foodSearch").val().trim().toLowerCase();

        if (searchText === "") {
            displayFood(availableFood);
            return;
        }

        const filteredFood = availableFood.filter(function (food) {
            const title = String(food.food_title || "").toLowerCase();
            const category = String(food.category || "").toLowerCase();
            const address = String(food.pickup_address || "").toLowerCase();

            return (
                title.includes(searchText) ||
                category.includes(searchText) ||
                address.includes(searchText)
            );
        });

        displayFood(filteredFood);
    }

    $("#searchBtn").click(function () {
        searchFood();
    });

    $("#radiusFilter").on("change", function () {
        loadAvailableFood();
    });

    $("#foodSearch").on("keyup", function () {
        searchFood();
    });


    // ==========================================
    // CLAIM FOOD
    // ==========================================

    $(document).on("click", ".claim-food-btn", function () {
        const foodId = $(this).data("food-id");
        if (!foodId) {
            alert("Food ID is missing.");
            return;
        }

        const button = $(this);
        const originalText = button.html();

        button.prop("disabled", true);
        button.html(`<span class="spinner-border spinner-border-sm me-1"></span>Claiming...`);

        $.ajax({
            url: "BACKEND/food/claim-food.php",
            type: "POST",
            data: {
                food_id: foodId,
                recipient_id: userId
            },
            dataType: "json",

            success: function (response) {
                console.log("CLAIM FOOD RESPONSE:", response);
                if (response.success) {
                    alert("Food claimed successfully! Check pickup details in My Claims.");
                    loadAvailableFood();
                    loadMyClaims();
                } else {
                    alert(response.message || "Unable to claim this food.");
                    button.prop("disabled", false).html(originalText);
                }
            },

            error: function (xhr) {
                console.error("CLAIM FOOD PHP ERROR:", xhr.responseText);
                alert("Something went wrong while claiming the food.");
                button.prop("disabled", false).html(originalText);
            }
        });
    });


    // ==========================================
    // LOAD MY CLAIMS
    // ==========================================

    function loadMyClaims() {
        console.log("Loading claims for recipient:", userId);
        $("#claimsLoading").show();

        $.ajax({
            url: "BACKEND/food/recipient-claims.php",
            type: "GET",
            data: { recipient_id: userId },
            dataType: "json",

            success: function (response) {
                console.log("MY CLAIMS API RESPONSE:", response);
                $("#claimsLoading").hide();

                if (!response.success) {
                    $("#claimsGrid").html(`
                        <div class="col-12">
                            <div class="alert alert-danger">
                                ${escapeHtml(response.message || "Unable to load claims.")}
                            </div>
                        </div>
                    `);
                    return;
                }

                const claims = Array.isArray(response.claims) ? response.claims : [];

                // Update statistics
                if (response.stats) {
                    $("#claimedCount").text(response.stats.claimed || 0);
                    $("#deliveredCount").text(response.stats.delivered || 0);
                } else {
                    $("#claimedCount").text(claims.length);
                    $("#deliveredCount").text(0);
                }

                displayClaims(claims);
            },

            error: function (xhr) {
                console.error("RECIPIENT CLAIMS AJAX ERROR:", xhr.responseText);
                $("#claimsLoading").hide();

                $("#claimsGrid").html(`
                    <div class="col-12">
                        <div class="alert alert-danger">
                            Unable to load your claims.
                        </div>
                    </div>
                `);
            }
        });
    }


    // ==========================================
    // DISPLAY CLAIMS (IMAGE + FEEDBACK SUPPORT)
    // ==========================================

    function displayClaims(claims) {
        const claimsGrid = $("#claimsGrid");
        claimsGrid.empty();

        if (!Array.isArray(claims) || claims.length === 0) {
            claimsGrid.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-hand-thumbs-up" style="font-size: 45px; color: #6c757d;"></i>
                        <h5 class="mt-3">No claims yet</h5>
                        <p class="text-muted">Food you claim will appear here.</p>
                    </div>
                </div>
            `);
            return;
        }

        claims.forEach(function (claim) {
            const status = String(claim.status || "CLAIMED").toUpperCase();
            let statusBadge = status === "DELIVERED" ? "bg-success" : "bg-primary";

            // Optional image thumbnail
            const imageHtml = claim.image
                ? `<img src="${escapeHtml(claim.image)}" class="card-img-top" style="height: 150px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;" alt="${escapeHtml(claim.food_title)}">`
                : "";

            // Feedback block for DELIVERED items
            let feedbackHtml = "";
            if (status === "DELIVERED") {
                if (claim.feedback_rating) {
                    const stars = "⭐".repeat(Number(claim.feedback_rating));
                    feedbackHtml = `
                        <div class="mt-3 p-2 bg-light rounded border">
                            <div class="small fw-bold text-warning">${stars} ${claim.feedback_rating}/5 Rated</div>
                            ${claim.feedback_comment ? `<div class="small text-muted fst-italic mt-1">"${escapeHtml(claim.feedback_comment)}"</div>` : ''}
                        </div>
                    `;
                } else {
                    feedbackHtml = `
                        <button type="button" class="btn btn-outline-success btn-sm w-100 mt-3 open-feedback-modal-btn" 
                            data-food-id="${claim.food_id}" 
                            data-food-title="${escapeHtml(claim.food_title)}">
                            <i class="bi bi-star me-1"></i> Give Feedback
                        </button>
                    `;
                }
            }

            claimsGrid.append(`
                <div class="col-12 col-md-6 col-xl-4">
                    <div class="card h-100 shadow-sm border-0">
                        ${imageHtml}
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title mb-0">
                                    ${escapeHtml(claim.food_title || "Food Donation")}
                                </h5>
                                <span class="badge ${statusBadge}">
                                    ${escapeHtml(status)}
                                </span>
                            </div>

                            <p class="text-muted mb-2">
                                <i class="bi bi-box me-1"></i>
                                Quantity:
                                <strong>${escapeHtml(claim.quantity ?? "N/A")}</strong>
                            </p>

                            <p class="text-muted mb-2">
                                <i class="bi bi-geo-alt me-1"></i>
                                ${escapeHtml(claim.pickup_address || "Address unavailable")}
                            </p>

                            <p class="text-muted mb-2">
                                <i class="bi bi-tag me-1"></i>
                                Category:
                                ${escapeHtml(claim.category || "N/A")}
                            </p>

                            <p class="text-muted mb-1">
                                <i class="bi bi-clock me-1"></i>
                                Claimed: ${formatDate(claim.claimed_at)}
                            </p>

                            ${claim.delivered_at ? `
                                <p class="text-muted mb-0">
                                    <i class="bi bi-check-circle me-1 text-success"></i>
                                    Delivered: ${formatDate(claim.delivered_at)}
                                </p>
                            ` : ""}

                            ${feedbackHtml}
                        </div>
                    </div>
                </div>
            `);
        });
    }


    // ==========================================
    // OPEN FEEDBACK MODAL
    // ==========================================

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


    // ==========================================
    // SUBMIT FEEDBACK
    // ==========================================

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
                console.error("Feedback submit error:", xhr.responseText);
                alert("An error occurred while submitting feedback. Please try again.");
            },

            complete: function () {
                btn.prop("disabled", false).html('<i class="bi bi-send me-1"></i> Submit Feedback');
            }
        });
    });


    // ==========================================
    // DATE & STRING FORMATTERS
    // ==========================================

    function formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(String(dateString).replace(" ", "T"));
        if (isNaN(date.getTime())) return escapeHtml(dateString);
        return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    }

    function escapeHtml(value) {
        return $("<div>").text(value ?? "").html();
    }


    // ==========================================
    // LOGOUT
    // ==========================================

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadAvailableFood();
    loadMyClaims();
});
