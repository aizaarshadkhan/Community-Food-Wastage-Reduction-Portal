/**
 * my-food.js - All Donor Food Listings View
 * 
 * Functional Requirements Handled:
 * - Donor Food Listings: Displays all active, claimed, delivered, and expired surplus food listings posted by the donor.
 * - Details Modal: Shows full listing metadata, recipient details, and hygiene/quality feedback.
 * - Actions: Edit listing, delete listing, and confirm delivery.
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

    let allFoodList = [];

    // 2. Load Food Listings
    function loadFoodListings() {
        const tbody = $("#foodTableBody");
        tbody.html('<tr><td colspan="7"><div class="food-loading"><div class="spinner-border spinner-border-sm me-2"></div>Loading your food listings...</div></td></tr>');

        $.ajax({
            url: "BACKEND/food/donor-food.php",
            type: "GET",
            data: { donor_id: userId },
            dataType: "json",
            success: function (response) {
                if (!response.success) {
                    tbody.html(`<tr><td colspan="7"><div class="empty-food"><i class="bi bi-exclamation-circle d-block"></i><p>${escapeHtml(response.message || "Unable to load food listings.")}</p></div></td></tr>`);
                    return;
                }

                allFoodList = response.food || [];
                if (allFoodList.length === 0) {
                    tbody.html('<tr><td colspan="7"><div class="empty-food"><i class="bi bi-basket d-block"></i><p>No food listings yet.</p></div></td></tr>');
                    return;
                }

                renderFoodTable(allFoodList);
            },
            error: function (xhr) {
                console.error("My Food PHP error:", xhr.responseText);
                tbody.html('<tr><td colspan="7"><div class="empty-food"><i class="bi bi-exclamation-triangle d-block"></i><p>Unable to load your food listings.</p></div></td></tr>');
            }
        });
    }

    // 3. Render Food Table Rows
    function renderFoodTable(foodList) {
        const tbody = $("#foodTableBody");
        tbody.empty();

        if (!foodList.length) {
            tbody.html('<tr><td colspan="7" class="text-center py-4 text-muted">No matching food listings found.</td></tr>');
            return;
        }

        foodList.forEach(function (food) {
            let statusClass = "available";
            if (food.status === "CLAIMED") statusClass = "claimed";
            else if (food.status === "DELIVERED") statusClass = "delivered";
            else if (food.status === "EXPIRED") statusClass = "expired";

            let expiryText = formatDate(food.expiry_datetime);

            // Action Dropdown Menu
            let actionMenu = `
                <div class="dropdown food-options-cell">
                    <button class="food-options-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More options">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                        <li>
                            <a class="dropdown-item view-food-btn" href="#" data-food-id="${food.id}">
                                <i class="bi bi-eye text-primary"></i> <span>View Details</span>
                            </a>
                        </li>
            `;

            if (food.status === "AVAILABLE") {
                actionMenu += `
                    <li>
                        <a class="dropdown-item edit-food-btn" href="#" data-food-id="${food.id}">
                            <i class="bi bi-pencil text-secondary"></i> <span>Edit</span>
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-danger delete-food-btn" href="#" data-food-id="${food.id}">
                            <i class="bi bi-trash"></i> <span>Delete</span>
                        </a>
                    </li>
                `;
            }

            if (food.status === "CLAIMED") {
                actionMenu += `
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-success mark-delivered-btn" href="#" data-food-id="${food.id}">
                            <i class="bi bi-check-circle"></i> <span>Mark as Delivered</span>
                        </a>
                    </li>
                `;
            }

            actionMenu += `</ul></div>`;

            const photoIcon = food.image ? '<i class="bi bi-image text-success me-1" title="Photo attached"></i>' : '';

            tbody.append(`
                <tr>
                    <td><div class="food-title">${photoIcon}<strong>${escapeHtml(food.food_title)}</strong></div></td>
                    <td>${escapeHtml(food.category || "-")}</td>
                    <td>${escapeHtml(food.quantity || "-")}</td>
                    <td><span class="status ${statusClass}">${escapeHtml(food.status || "-")}</span></td>
                    <td><small>${expiryText}</small></td>
                    <td><small>${escapeHtml(food.pickup_address || "-")}</small></td>
                    <td class="food-options-cell">${actionMenu}</td>
                </tr>
            `);
        });
    }

    // 4. View Details Modal Handler
    $(document).on("click", ".view-food-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        const food = allFoodList.find(item => String(item.id) === String(foodId));
        if (!food) {
            alert("Food listing details not found.");
            return;
        }

        $("#modalFoodTitle").text(food.food_title || "-");
        $("#modalFoodCategory").text(food.category || "-");
        $("#modalFoodQuantity").text(food.quantity || "-");
        $("#modalFoodAddress").text(food.pickup_address || "-");
        $("#modalFoodExpiry").text(formatDate(food.expiry_datetime));

        let statusClass = "available";
        if (food.status === "CLAIMED") statusClass = "claimed";
        else if (food.status === "DELIVERED") statusClass = "delivered";
        else if (food.status === "EXPIRED") statusClass = "expired";

        $("#modalFoodStatus").removeClass("available claimed delivered expired").addClass(statusClass).text(food.status || "-");

        if (food.status === "CLAIMED" || food.status === "DELIVERED") {
            $("#modalReceiverDetails").text("Food claimed by recipient");
            $("#modalOrganization").text(food.ngo_name || "Not provided");
            $("#modalContactPerson").text(food.contact_person || "Not provided");
            $("#modalPhone").text(food.recipient_phone || "Not provided");
            $("#modalReceiverAddress").text(food.recipient_address || "Not provided");
        } else {
            $("#modalReceiverDetails").text("Not claimed yet");
            $("#modalOrganization").text("-");
            $("#modalContactPerson").text("-");
            $("#modalPhone").text("-");
            $("#modalReceiverAddress").text("-");
        }

        // Photo & Feedback
        if (food.image) {
            $("#modalFoodPhoto").attr("src", food.image);
            $("#modalFoodPhotoContainer").removeClass("d-none");
        } else {
            $("#modalFoodPhoto").attr("src", "");
            $("#modalFoodPhotoContainer").addClass("d-none");
        }

        if (food.feedback_rating) {
            const stars = "⭐".repeat(Number(food.feedback_rating)) + ` ${food.feedback_rating}/5 Stars`;
            $("#modalFeedbackRating").text(stars);
            $("#modalFeedbackComment").text(food.feedback_comment ? `"${food.feedback_comment}"` : "No written comment provided.");
            $("#modalFeedbackContainer").removeClass("d-none");
        } else {
            $("#modalFeedbackContainer").addClass("d-none");
        }

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("foodDetailsModal"));
        modal.show();
    });

    // 5. Edit Food Action
    $(document).on("click", ".edit-food-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        window.location.href = "edit-food.html?id=" + foodId;
    });

    // 6. Delete Food Action
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
            data: { food_id: foodId, donor_id: userId },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert("Food listing deleted successfully.");
                    loadFoodListings();
                } else {
                    alert(res.message || "Unable to delete food listing.");
                }
            },
            error: function () {
                alert("Something went wrong while deleting the food listing.");
            }
        });
    });

    // 7. Mark as Delivered Action
    $(document).on("click", ".mark-delivered-btn", function (e) {
        e.preventDefault();
        const foodId = $(this).data("food-id");
        if (!foodId) return;

        if (!confirm("Confirm that this surplus food donation has been delivered?")) {
            return;
        }

        $.ajax({
            url: "BACKEND/food/mark-delivered.php",
            type: "POST",
            data: { food_id: foodId, donor_id: userId },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    alert(res.message);
                    loadFoodListings();
                } else {
                    alert(res.message || "Unable to mark food as delivered.");
                }
            },
            error: function () {
                alert("Something went wrong while updating the food.");
            }
        });
    });

    // 8. Helpers
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
    loadFoodListings();
});
