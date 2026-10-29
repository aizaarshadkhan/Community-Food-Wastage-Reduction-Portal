/**
 * admin-dashboard.js - Admin Dashboard Frontend Script
 * 
 * Functional Requirements Handled:
 * 1. Admin Reports & Graphical Analytics:
 *    - City-wise donation trends Bar Chart (Chart.js)
 *    - Food category distribution Doughnut Chart (Chart.js)
 *    - Platform impact numbers: Total waste reduced (kg), meals saved, people fed.
 * 2. NGO Verification Management:
 *    - View uploaded NGO verification documents.
 *    - Approve (VERIFIED) or Reject (REJECTED) recipient accounts in 1-click.
 * 3. Food Category Management:
 *    - Create new food categories dynamically.
 *    - View and remove categories.
 * 4. User and Listing Moderation:
 *    - Search and remove inappropriate food listings or users.
 */

$(document).ready(function () {
    // ============================================================
    // 1. AUTHENTICATION & ACCESS CONTROL
    // ============================================================
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user_id");

    if (!userId || !role || role.toUpperCase() !== "ADMIN") {
        alert("Access restricted to administrators only. Please login as admin.");
        window.location.href = "login.html";
        return;
    }

    let allUsers = [];
    let allListings = [];
    let allCategories = [];
    let pendingDeleteUserId = null;
    let pendingDeleteFoodId = null;

    let cityChart = null;
    let categoryChart = null;

    // Modals
    const userModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    const foodModal = new bootstrap.Modal(document.getElementById('deleteFoodModal'));
    const detailModal = new bootstrap.Modal(document.getElementById('adminFoodDetailModal'));

    // Toast Alert Helper
    function showToast(message, isError) {
        const toast = $("#toastAlert");
        toast.removeClass("alert-success alert-danger d-none")
             .addClass(isError ? "alert-danger" : "alert-success")
             .addClass("show");
        $("#toastMessage").text(message);

        setTimeout(function () {
            toast.removeClass("show").addClass("d-none");
        }, 4000);
    }

    // ============================================================
    // 2. FETCH & POPULATE ADMIN DATA
    // ============================================================
    function loadAdminData() {
        $.ajax({
            url: "BACKEND/admin/get-admin-data.php",
            type: "GET",
            dataType: "json",
            success: function (res) {
                if (!res.success) {
                    showToast("Failed to load admin data: " + res.message, true);
                    return;
                }

                // High-level Stats
                $("#statDonors").text(res.stats.total_donors || 0);
                $("#statRecipients").text(res.stats.total_recipients || 0);
                $("#statListings").text(res.stats.total_listings || 0);
                $("#statDelivered").text(res.stats.total_delivered || 0);

                // Social Impact Metrics (Admin Reports)
                $("#statWasteReduced").text((res.stats.total_waste_reduced_kg || 0) + " kg");
                $("#statMealsSaved").text(res.stats.meals_saved || 0);
                $("#statPeopleFed").text(res.stats.people_fed || 0);

                // Render Chart.js Analytics
                if (res.analytics) {
                    renderCharts(res.analytics);
                }

                // Render Verification Table
                allUsers = res.users || [];
                renderVerifications(allUsers);
                renderUsers(allUsers);

                // Render Listings
                allListings = res.listings || [];
                renderListings(allListings);

                // Render Categories
                allCategories = res.categories || [];
                renderCategories(allCategories);
            },
            error: function () {
                showToast("Error connecting to admin backend.", true);
            }
        });
    }

    // ============================================================
    // 3. GRAPHICAL ANALYTICS (Chart.js)
    // ============================================================
    function renderCharts(analytics) {
        // 1. City-wise Donation Trends (Bar Chart)
        const cityData = analytics.cities || [];
        const cityLabels = cityData.map(c => c.city_name || "Unknown");
        const cityCounts = cityData.map(c => c.count);

        const ctxCity = document.getElementById("cityTrendsChart").getContext("2d");
        if (cityChart) cityChart.destroy();

        cityChart = new Chart(ctxCity, {
            type: "bar",
            data: {
                labels: cityLabels.length ? cityLabels : ["No Data"],
                datasets: [{
                    label: "Donations",
                    data: cityCounts.length ? cityCounts : [0],
                    backgroundColor: "#065C4B",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });

        // 2. Category Breakdown (Doughnut Chart)
        const catData = analytics.categories || [];
        const catLabels = catData.map(c => c.category);
        const catCounts = catData.map(c => c.count);

        const ctxCat = document.getElementById("categoryTrendsChart").getContext("2d");
        if (categoryChart) categoryChart.destroy();

        categoryChart = new Chart(ctxCat, {
            type: "doughnut",
            data: {
                labels: catLabels.length ? catLabels : ["No Listings"],
                datasets: [{
                    data: catCounts.length ? catCounts : [1],
                    backgroundColor: ["#198754", "#dc3545", "#fd7e14", "#0d6efd", "#6f42c1"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } }
                }
            }
        });
    }

    // ============================================================
    // 4. NGO VERIFICATION REQUESTS PANEL
    // ============================================================
    function renderVerifications(users) {
        const tbody = $("#verificationsTableBody");
        tbody.empty();

        const recipients = users.filter(u => u.role === "RECIPIENT");
        if (!recipients.length) {
            tbody.html('<tr><td colspan="8" class="text-center py-3 text-muted">No recipient accounts found.</td></tr>');
            return;
        }

        recipients.forEach(function (u) {
            const status = (u.verification_status || "PENDING").toUpperCase();
            let badgeClass = "bg-warning text-dark";
            if (status === "VERIFIED") badgeClass = "bg-success";
            if (status === "REJECTED") badgeClass = "bg-danger";

            // Verification Document Link
            let docHtml = '<span class="text-muted small">No doc</span>';
            if (u.verification_doc) {
                const docUrl = "UPLOADS/documents/" + u.verification_doc;
                docHtml = `<a href="${escapeHtml(docUrl)}" target="_blank" class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size:12px;">
                    <i class="bi bi-file-earmark-pdf"></i> View Doc
                </a>`;
            }

            // Action Buttons
            let actionBtns = "";
            if (status === "PENDING" || status === "REJECTED") {
                actionBtns += `<button type="button" class="btn btn-sm btn-success py-0 px-2 verify-status-btn me-1" data-id="${u.id}" data-status="VERIFIED" style="font-size:12px;">
                    <i class="bi bi-check-lg"></i> Approve
                </button>`;
            }
            if (status === "PENDING" || status === "VERIFIED") {
                actionBtns += `<button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 verify-status-btn" data-id="${u.id}" data-status="REJECTED" style="font-size:12px;">
                    <i class="bi bi-x-lg"></i> Reject
                </button>`;
            }

            tbody.append(`
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${escapeHtml(u.ngo_name || "-")}</strong></td>
                    <td>${escapeHtml(u.contact_person || "-")}</td>
                    <td><small>${escapeHtml(u.phone || "-")}</small></td>
                    <td><small>${escapeHtml(u.email)}</small></td>
                    <td>${docHtml}</td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td class="text-end text-nowrap">${actionBtns}</td>
                </tr>
            `);
        });
    }

    // Action: Approve or Reject NGO Verification
    $(document).on("click", ".verify-status-btn", function () {
        const targetUserId = $(this).data("id");
        const newStatus = $(this).data("status");

        if (!confirm(`Are you sure you want to set this recipient's verification status to ${newStatus}?`)) {
            return;
        }

        $.ajax({
            url: "BACKEND/admin/verify-user.php",
            type: "POST",
            data: {
                admin_id: userId,
                user_id: targetUserId,
                status: newStatus
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    showToast(res.message, false);
                    loadAdminData();
                } else {
                    showToast(res.message, true);
                }
            },
            error: function () {
                showToast("Error updating verification status.", true);
            }
        });
    });

    // ============================================================
    // 5. FOOD CATEGORY MANAGEMENT (CRUD)
    // ============================================================
    function renderCategories(categories) {
        const tbody = $("#categoriesTableBody");
        tbody.empty();

        if (!categories.length) {
            tbody.html('<tr><td colspan="4" class="text-center py-2 text-muted">No food categories configured.</td></tr>');
            return;
        }

        categories.forEach(function (cat) {
            tbody.append(`
                <tr>
                    <td>#${cat.id}</td>
                    <td><strong>${escapeHtml(cat.name)}</strong></td>
                    <td><code>${escapeHtml(cat.code)}</code></td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 delete-cat-btn" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="font-size:12px;">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // Add New Category Form Submission
    $("#addCategoryForm").submit(function (e) {
        e.preventDefault();
        const name = $("#catName").val().trim();
        const code = $("#catCode").val().trim();

        if (!name || !code) return;

        const btn = $("#saveCatBtn");
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Saving...');

        $.ajax({
            url: "BACKEND/admin/manage-categories.php",
            type: "POST",
            data: {
                admin_id: userId,
                action: "ADD",
                name: name,
                code: code
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    showToast(res.message, false);
                    $("#catName").val("");
                    $("#catCode").val("");
                    loadAdminData();
                } else {
                    showToast(res.message, true);
                }
            },
            error: function () {
                showToast("Failed to save food category.", true);
            },
            complete: function () {
                btn.prop("disabled", false).html('<i class="bi bi-check-lg me-1"></i> Save Category');
            }
        });
    });

    // Delete Food Category
    $(document).on("click", ".delete-cat-btn", function () {
        const catId = $(this).data("id");
        const catName = $(this).data("name");

        if (!confirm(`Are you sure you want to delete category "${catName}"?`)) {
            return;
        }

        $.ajax({
            url: "BACKEND/admin/manage-categories.php",
            type: "POST",
            data: {
                admin_id: userId,
                action: "DELETE",
                category_id: catId
            },
            dataType: "json",
            success: function (res) {
                if (res.success) {
                    showToast(res.message, false);
                    loadAdminData();
                } else {
                    showToast(res.message, true);
                }
            },
            error: function () {
                showToast("Error deleting category.", true);
            }
        });
    });

    // ============================================================
    // 6. USERS TABLE RENDERING & REMOVAL
    // ============================================================
    function renderUsers(users) {
        const tbody = $("#usersTableBody");
        tbody.empty();

        if (!users.length) {
            tbody.html('<tr><td colspan="9" class="text-center py-3">No users found.</td></tr>');
            return;
        }

        users.forEach(function (u) {
            let badgeClass = "badge-role-donor";
            if (u.role === "RECIPIENT") badgeClass = "badge-role-recipient";
            if (u.role === "ADMIN") badgeClass = "badge-role-admin";

            const displayName = u.business_name || u.ngo_name || "-";
            const joined = u.created_at ? new Date(u.created_at).toLocaleDateString() : "-";

            let actionHtml = '';
            if (String(u.id) === String(userId)) {
                actionHtml = '<span class="badge bg-light text-muted border">You (Admin)</span>';
            } else {
                actionHtml = `
                    <button type="button" class="btn btn-sm btn-outline-danger delete-user-btn" 
                        data-id="${u.id}" 
                        data-email="${escapeHtml(u.email)}" 
                        data-role="${u.role}">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                `;
            }

            tbody.append(`
                <tr>
                    <td>#${u.id}</td>
                    <td><span class="badge ${badgeClass}">${u.role}</span></td>
                    <td><strong>${escapeHtml(u.email)}</strong></td>
                    <td>${escapeHtml(displayName)}</td>
                    <td>${escapeHtml(u.contact_person || "-")}</td>
                    <td>${escapeHtml(u.phone || "-")}</td>
                    <td><small>${escapeHtml(u.address || "-")}</small></td>
                    <td><small class="text-muted">${joined}</small></td>
                    <td class="text-end">${actionHtml}</td>
                </tr>
            `);
        });
    }

    // ============================================================
    // 7. FOOD LISTINGS TABLE RENDERING & ACTIONS
    // ============================================================
    function renderListings(listings) {
        const tbody = $("#foodTableBody");
        tbody.empty();

        if (!listings.length) {
            tbody.html('<tr><td colspan="9" class="text-center py-3">No food records found.</td></tr>');
            return;
        }

        listings.forEach(function (f) {
            let statusBadge = "bg-secondary";
            if (f.status === "AVAILABLE") statusBadge = "bg-success";
            if (f.status === "CLAIMED") statusBadge = "bg-warning text-dark";
            if (f.status === "DELIVERED") statusBadge = "bg-primary";
            if (f.status === "EXPIRED") statusBadge = "bg-danger";

            const donor = f.donor_name ? `${f.donor_name} (${f.donor_email})` : (f.donor_email || "-");
            const recipient = f.recipient_name ? `${f.recipient_name} (${f.recipient_email})` : (f.recipient_email || "-");
            const photoIcon = f.image ? '<i class="bi bi-image text-success me-1" title="Photo available"></i>' : '';

            tbody.append(`
                <tr>
                    <td>#${f.id}</td>
                    <td>${photoIcon}<strong>${escapeHtml(f.food_title)}</strong></td>
                    <td><span class="badge bg-light text-dark border">${f.category}</span></td>
                    <td>${escapeHtml(f.quantity)}</td>
                    <td><small>${escapeHtml(donor)}</small></td>
                    <td><span class="badge ${statusBadge}">${f.status}</span></td>
                    <td><small>${escapeHtml(recipient)}</small></td>
                    <td><small class="text-muted">${escapeHtml(f.expiry_datetime)}</small></td>
                    <td class="text-end text-nowrap">
                        <button type="button" class="btn btn-sm btn-outline-primary view-food-detail-btn me-1" data-id="${f.id}" title="View details">
                            <i class="bi bi-eye"></i> View
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-food-btn" 
                            data-id="${f.id}" data-title="${escapeHtml(f.food_title)}" data-donor="${escapeHtml(donor)}">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // ============================================================
    // 8. SEARCH FILTERS
    // ============================================================
    $("#searchUsers").on("keyup", function () {
        const term = $(this).val().toLowerCase();
        const filtered = allUsers.filter(function (u) {
            return (u.email && u.email.toLowerCase().includes(term)) ||
                   (u.business_name && u.business_name.toLowerCase().includes(term)) ||
                   (u.ngo_name && u.ngo_name.toLowerCase().includes(term)) ||
                   (u.contact_person && u.contact_person.toLowerCase().includes(term)) ||
                   (u.phone && u.phone.includes(term));
        });
        renderUsers(filtered);
    });

    $("#searchFood").on("keyup", function () {
        const term = $(this).val().toLowerCase();
        const filtered = allListings.filter(function (f) {
            return (f.food_title && f.food_title.toLowerCase().includes(term)) ||
                   (f.category && f.category.toLowerCase().includes(term)) ||
                   (f.donor_email && f.donor_email.toLowerCase().includes(term)) ||
                   (f.status && f.status.toLowerCase().includes(term));
        });
        renderListings(filtered);
    });

    // ============================================================
    // 9. VIEW FOOD DETAILS MODAL
    // ============================================================
    $(document).on("click", ".view-food-detail-btn", function () {
        const foodId = $(this).data("id");
        if (!foodId) return;

        $.ajax({
            url: "BACKEND/food/food-detail.php",
            type: "GET",
            data: { food_id: foodId },
            dataType: "json",
            success: function (res) {
                if (!res.success || !res.food) {
                    showToast("Unable to load donation details.", true);
                    return;
                }

                const f = res.food;
                $("#adminModalId").text(f.id);
                $("#adminModalTitle").text(f.food_title);
                $("#adminModalCreated").text(f.created_at || "-");
                $("#adminModalQuantity").text(f.quantity);
                $("#adminModalExpiry").text(f.expiry_datetime || "-");
                $("#adminModalAddress").text(f.pickup_address || "-");
                $("#adminModalCoords").text((f.latitude && f.longitude) ? `${f.latitude}, ${f.longitude}` : "N/A");

                if (f.image) {
                    $("#adminModalPhoto").attr("src", f.image).removeClass("d-none");
                    $("#adminModalNoPhoto").addClass("d-none");
                } else {
                    $("#adminModalPhoto").attr("src", "").addClass("d-none");
                    $("#adminModalNoPhoto").removeClass("d-none");
                }

                $("#adminModalCategoryBadge").text(f.category);
                let sBadge = "bg-secondary";
                if (f.status === "AVAILABLE") sBadge = "bg-success";
                if (f.status === "CLAIMED") sBadge = "bg-warning text-dark";
                if (f.status === "DELIVERED") sBadge = "bg-primary";
                if (f.status === "EXPIRED") sBadge = "bg-danger";
                $("#adminModalStatusBadge").removeClass().addClass(`badge ${sBadge} px-3 py-2 fs-6`).text(f.status);

                const d = f.donor || {};
                $("#adminModalDonorName").text(d.name || "-");
                $("#adminModalDonorContact").text(d.contact_person || "-");
                $("#adminModalDonorEmail").text(d.email || "-");
                $("#adminModalDonorPhone").text(d.phone || "-");

                const r = f.receiver;
                const cl = f.claim;
                if (r) {
                    $("#adminModalRecipientInfo").removeClass("d-none");
                    $("#adminModalNoRecipient").addClass("d-none");
                    $("#adminModalRecipientOrg").text(r.organization || "-");
                    $("#adminModalRecipientContact").text(r.contact_person || "-");
                    $("#adminModalRecipientPhone").text(r.phone || "-");
                    $("#adminModalClaimedAt").text(cl && cl.claimed_at ? cl.claimed_at : "-");
                    $("#adminModalDeliveredAt").text(cl && cl.delivered_at ? cl.delivered_at : "Pending delivery");
                } else {
                    $("#adminModalRecipientInfo").addClass("d-none");
                    $("#adminModalNoRecipient").removeClass("d-none");
                }

                const fb = f.feedback;
                if (fb) {
                    const stars = "⭐".repeat(Number(fb.rating)) + ` ${fb.rating}/5`;
                    $("#adminModalFeedbackRating").text(stars);
                    $("#adminModalFeedbackComment").text(fb.comment ? `"${fb.comment}"` : "No written comment provided.");
                    $("#adminModalFeedbackSection").removeClass("d-none");
                } else {
                    $("#adminModalFeedbackSection").addClass("d-none");
                }

                detailModal.show();
            },
            error: function () {
                showToast("Failed to fetch donation details from server.", true);
            }
        });
    });

    // ============================================================
    // 10. DELETE USER & DELETE FOOD HANDLERS
    // ============================================================
    $(document).on("click", ".delete-user-btn", function () {
        pendingDeleteUserId = $(this).data("id");
        $("#modalUserEmail").text($(this).data("email"));
        $("#modalUserRole").text("Role: " + $(this).data("role") + " (ID: #" + pendingDeleteUserId + ")");
        userModal.show();
    });

    $("#confirmDeleteUserBtn").click(function () {
        if (!pendingDeleteUserId) return;
        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Deleting...');

        $.ajax({
            url: "BACKEND/admin/delete-user.php",
            type: "POST",
            data: { admin_id: userId, user_id: pendingDeleteUserId },
            dataType: "json",
            success: function (res) {
                userModal.hide();
                if (res.success) {
                    showToast(res.message, false);
                    loadAdminData();
                } else {
                    showToast(res.message, true);
                }
            },
            error: function () {
                userModal.hide();
                showToast("Error processing user deletion.", true);
            },
            complete: function () {
                btn.prop("disabled", false).html('<i class="bi bi-trash me-1"></i>Delete User');
                pendingDeleteUserId = null;
            }
        });
    });

    $(document).on("click", ".delete-food-btn", function () {
        pendingDeleteFoodId = $(this).data("id");
        $("#modalFoodTitle").text($(this).data("title"));
        $("#modalFoodMeta").text("Donor: " + $(this).data("donor") + " (ID: #" + pendingDeleteFoodId + ")");
        foodModal.show();
    });

    $("#confirmDeleteFoodBtn").click(function () {
        if (!pendingDeleteFoodId) return;
        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-1"></span>Deleting...');

        $.ajax({
            url: "BACKEND/admin/delete-food.php",
            type: "POST",
            data: { admin_id: userId, food_id: pendingDeleteFoodId },
            dataType: "json",
            success: function (res) {
                foodModal.hide();
                if (res.success) {
                    showToast(res.message, false);
                    loadAdminData();
                } else {
                    showToast(res.message, true);
                }
            },
            error: function () {
                foodModal.hide();
                showToast("Error processing food deletion.", true);
            },
            complete: function () {
                btn.prop("disabled", false).html('<i class="bi bi-trash me-1"></i>Delete Listing');
                pendingDeleteFoodId = null;
            }
        });
    });

    function escapeHtml(text) {
        if (!text) return "";
        return $('<div>').text(text).html();
    }

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });

    // Initial load
    loadAdminData();
});
