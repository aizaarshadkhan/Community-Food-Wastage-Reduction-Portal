/**
 * donor-dashboard.js - Donor Dashboard Logic
 * 
 * Functional Requirements Handled:
 * 1. Summary Statistics: Active listings, total listings, claimed, and delivered.
 * 2. Impact Metrics: Populates "150 meals saved", "Total waste diverted (kg)", and "CO2 reduction".
 * 3. Recent Food Listings Table: Shows real-time statuses and actions (View details, Edit, Delete, Mark as Delivered).
 * 4. Feedback Display: Shows recipient quality & hygiene ratings in listing details modal.
 */

$(document).ready(function () {
    // ============================================================
    // 1. AUTHENTICATION CHECK
    // ============================================================
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "DONOR") {
        alert("Please login as a donor first.");
        window.location.href = "login.html";
        return;
    }

    // ============================================================
    // 2. LOAD DASHBOARD DATA (Stats, Impact Metrics, Food Table)
    // ============================================================
    function loadDashboard() {
        $.ajax({
            url: "BACKEND/food/donor-food.php",
            type: "GET",
            data: { donor_id: userId },
            dataType: "json",
            success: function (response) {
                if (!response.success) {
                    alert(response.message || "Unable to load dashboard.");
                    return;
                }

                // 1. Populate Status Counter Cards
                $("#statTotalListings").text(response.stats.total || 0);
                $("#statAvailable").text(response.stats.available || 0);
                $("#statClaimed").text(response.stats.claimed || 0);
                $("#statDelivered").text(response.stats.delivered || 0);

                // 2. Populate Impact Metrics (Functional Requirement: 150 meals saved)
                if (response.impact) {
                    $("#statMealsSaved").text(response.impact.meals_saved || 0);
                    $("#statWasteDiverted").text((response.impact.waste_diverted_kg || 0) + " kg");
                    $("#statCo2Saved").text((response.impact.co2_saved_kg || 0) + " kg");
                }

                // 3. Render Recent Food Listings Table
                const tbody = $("#donorFoodTableBody");
                tbody.empty();

                const foodList = response.food || [];
                if (foodList.length === 0) {
                    tbody.html('<tr><td colspan="5" class="text-center py-4 text-muted">No food listings yet. Click "Add Food" to share surplus food.</td></tr>');
                    return;
                }

                // Show up to 10 most recent listings
                const recentFood = foodList.slice(0, 10);
                recentFood.forEach(function (food) {
                    let statusClass = "available";
                    if (food.status === "CLAIMED") statusClass = "claimed";
                    else if (food.status === "DELIVERED") statusClass = "delivered";
                    else if (food.status === "EXPIRED") statusClass = "expired";

                    let expiryText = formatDate(food.expiry_datetime);

                    // Dropdown menu actions
                    let actionMenu = `
                        <div class="dropdown">
                            <button class="btn btn-sm btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More options">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                <li>
                                    <a class="dropdown-item view-food-btn" href="#" data-food-id="${food.id}">
                                        <i class="bi bi-eye me-2 text-primary"></i> View Details
                                    </a>
                                </li>
                    `;

                    // Edit & Delete available only if AVAILABLE
                    if (food.status === "AVAILABLE") {
                        actionMenu += `
                            <li>
                                <a class="dropdown-item edit-food-btn" href="#" data-food-id="${food.id}">
                                    <i class="bi bi-pencil me-2 text-secondary"></i> Edit
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger delete-food-btn" href="#" data-food-id="${food.id}">
                                    <i class="bi bi-trash me-2"></i> Delete
                                </a>
                            </li>
                        `;
                    }

                    // Mark as Delivered available if CLAIMED
                    if (food.status === "CLAIMED") {
                        actionMenu += `
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-success mark-delivered-btn" href="#" data-food-id="${food.id}">
                                    <i class="bi bi-check2-circle me-2"></i> Mark as Delivered
                                </a>
                            </li>
                        `;
                    }

                    actionMenu += `</ul></div>`;

                    const photoIndicator = food.image ? '<i class="bi bi-image text-success me-1" title="Photo attached"></i>' : '';

                    tbody.append(`
                        <tr>
                            <td>${photoIndicator}<strong>${escapeHtml(food.food_title)}</strong></td>
                            <td>${escapeHtml(food.quantity)}</td>
                            <td><span class="status ${statusClass}">${escapeHtml(food.status)}</span></td>
                            <td><small>${expiryText}</small></td>
                            <td>${actionMenu}</td>
                        </tr>
                    `);
                });
            },
            error: function (xhr) {
                console.error("Dashboard error:", xhr.responseText);
                alert("Unable to load donor dashboard. Please check your connection.");
            }
        });
    }

    // ============================================================
    // 3. VIEW FOOD DETAILS MODAL
    // ============================================================
    $(document).on("click", ".view-food-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        $.ajax({
            url: "BACKEND/food/food-detail.php",
            type: "GET",
            data: { food_id: foodId },
            dataType: "json",
            success: function (res) {
                if (!res.success || !res.food) {
                    alert(res.message || "Unable to load food details.");
                    return;
                }

                const food = res.food;
                $("#modalFoodTitle").text(food.food_title || "-");
                $("#modalFoodCategory").text(food.category || "-");
                $("#modalFoodQuantity").text(food.quantity || "-");
                $("#modalFoodAddress").text(food.pickup_address || "-");

                let statusClass = "available";
                if (food.status === "CLAIMED") statusClass = "claimed";
                else if (food.status === "DELIVERED") statusClass = "delivered";
                else if (food.status === "EXPIRED") statusClass = "expired";

                $("#modalFoodStatus")
                    .removeClass("available expired claimed delivered")
                    .addClass(statusClass)
                    .text(food.status || "-");

                $("#modalFoodExpiry").text(formatDate(food.expiry_datetime));

                // Photo preview
                if (food.image) {
                    $("#modalFoodPhoto").attr("src", food.image);
                    $("#modalFoodPhotoContainer").removeClass("d-none");
                } else {
                    $("#modalFoodPhoto").attr("src", "");
                    $("#modalFoodPhotoContainer").addClass("d-none");
                }

                // Receiver Details
                const receiverSection = $("#receiverDetailsSection");
                if (food.status === "CLAIMED" || food.status === "DELIVERED") {
                    receiverSection.show();
                    const r = food.receiver;
                    if (r) {
                        $("#modalOrganization").text(r.organization || "Not provided");
                        $("#modalContactPerson").text(r.contact_person || "Not provided");
                        $("#modalPhone").text(r.phone || "Not provided");
                        $("#modalReceiverAddress").text(r.address || "Not provided");
                    } else {
                        $("#modalOrganization").text("Claimed by recipient");
                        $("#modalContactPerson").text("-");
                        $("#modalPhone").text("-");
                        $("#modalReceiverAddress").text("-");
                    }
                } else {
                    receiverSection.hide();
                }

                // Quality & Hygiene Feedback (Functional Requirement 7)
                if (food.feedback) {
                    const stars = "⭐".repeat(Number(food.feedback.rating)) + ` ${food.feedback.rating}/5 Stars`;
                    $("#modalFeedbackRating").text(stars);
                    $("#modalFeedbackComment").text(food.feedback.comment ? `"${food.feedback.comment}"` : "No written comment provided.");
                    $("#modalFeedbackContainer").removeClass("d-none");
                } else {
                    $("#modalFeedbackContainer").addClass("d-none");
                }

                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("foodDetailsModal"));
                modal.show();
            },
            error: function (xhr) {
                console.error("Food detail error:", xhr.responseText);
                alert("Unable to fetch food details.");
            }
        });
    });

    // ============================================================
    // 4. EDIT FOOD REDIRECT
    // ============================================================
    $(document).on("click", ".edit-food-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        window.location.href = "edit-food.html?id=" + foodId;
    });

    // ============================================================
    // 5. DELETE FOOD LISTING
    // ============================================================
    $(document).on("click", ".delete-food-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        if (!confirm("Are you sure you want to delete this food listing?")) {
            return;
        }

        $.ajax({
            url: "BACKEND/food/delete-food.php",
            type: "POST",
            data: {
                food_id: foodId,
                donor_id: userId
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert("Food listing deleted successfully.");
                    loadDashboard();
                } else {
                    alert(res.message || "Unable to delete food listing.");
                }
            },
            error: function () {
                alert("Something went wrong while deleting the food listing.");
            }
        });
    });

    // ============================================================
    // 6. MARK AS DELIVERED ACTION
    // ============================================================
    $(document).on("click", ".mark-delivered-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        if (!confirm("Confirm that this surplus food donation has been delivered/picked up?")) {
            return;
        }

        $.ajax({
            url: "BACKEND/food/mark-delivered.php",
            type: "POST",
            data: {
                food_id: foodId,
                donor_id: userId
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert(res.message);
                    loadDashboard();
                } else {
                    alert(res.message || "Unable to mark food as delivered.");
                }
            },
            error: function () {
                alert("Error occurred while updating delivery status.");
            }
        });
    });

    // ============================================================
    // 7. HELPERS
    // ============================================================
    function formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(String(dateString).replace(" ", "T"));
        if (isNaN(date.getTime())) return escapeHtml(dateString);
        return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    }

    function escapeHtml(value) {
        return $("<div>").text(value ?? "").html();
    }

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });

    // Initial load
    loadDashboard();
});
