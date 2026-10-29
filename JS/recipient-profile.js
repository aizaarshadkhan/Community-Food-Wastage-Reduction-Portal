/**
 * recipient-profile.js - Recipient Profile Management Logic
 * 
 * Functional Requirements Handled:
 * - Loads and displays registered NGO organization profile, contact person, phone, email,
 *   address, GPS coordinates, verification status, and document upload confirmation.
 */

$(document).ready(function () {
    // 1. Check Logged-in User
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "RECIPIENT") {
        alert("Please login as a recipient first.");
        window.location.href = "login.html";
        return;
    }

    // 2. Fetch Recipient Profile
    function loadProfile() {
        $("#profileLoading").show();
        $("#profileError").hide();

        $.ajax({
            url: "BACKEND/food/recipient-profile.php",
            type: "GET",
            data: { recipient_id: userId },
            dataType: "json",
            success: function (response) {
                $("#profileLoading").hide();

                if (!response.success) {
                    $("#profileError").text(response.message || "Unable to load your profile.").show();
                    return;
                }

                const profile = response.profile;
                $("#ngoName").text(profile.ngo_name || "Not provided");
                $("#profileNgoName").text(profile.ngo_name || "Not provided");
                $("#profileContactPerson").text(profile.contact_person || "Not provided");
                $("#profileEmail").text(profile.email || "Not provided");
                $("#profilePhone").text(profile.phone || "Not provided");
                $("#profileAddress").text(profile.address || "Not provided");
                $("#profileLatitude").text(profile.latitude || "Not available");
                $("#profileLongitude").text(profile.longitude || "Not available");
                $("#profileRole").text(profile.role || "RECIPIENT");
                $("#profileCreatedAt").text(formatDate(profile.created_at));

                // Verification status badge
                const status = (profile.verification_status || "PENDING").toUpperCase();
                let statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Pending Admin Verification</span>';
                if (status === "VERIFIED") {
                    statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Verified Organization</span>';
                } else if (status === "REJECTED") {
                    statusBadge = '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Verification Rejected</span>';
                }
                $(".account-badge").html(statusBadge);

                $(".profile-card").show();
            },
            error: function (xhr) {
                console.error("recipient-profile error:", xhr.responseText);
                $("#profileLoading").hide();
                $("#profileError").text("Unable to connect to the profile server.").show();
            }
        });
    }

    // 3. Helpers & Logout
    function formatDate(dateString) {
        if (!dateString) return "Not available";
        const date = new Date(String(dateString).replace(" ", "T"));
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
    }

    $("#logoutBtn").click(function (e) {
        e.preventDefault();
        window.location.href = "logout.html";
    });

    // Initial load
    loadProfile();
});
