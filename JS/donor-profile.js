/**
 * donor-profile.js - Donor Profile Management Logic
 * 
 * Functional Requirements Handled:
 * - Displays donor's organization/restaurant name, contact phone, email, GPS coordinates, and joined date.
 */

$(document).ready(function () {
    // 1. Session Authentication Check
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    if (!userId || !role || role.toUpperCase() !== "DONOR") {
        alert("Please login as a donor first.");
        window.location.href = "login.html";
        return;
    }

    // 2. Fetch Donor Profile
    function loadProfile() {
        $("#profileLoading").show();
        $("#profileError").hide();

        $.ajax({
            url: "BACKEND/food/donor-profile.php",
            type: "GET",
            data: { donor_id: userId },
            dataType: "json",
            success: function (response) {
                $("#profileLoading").hide();

                if (!response.success) {
                    $("#profileError").text(response.message || "Unable to load your profile.").show();
                    return;
                }

                const profile = response.profile;
                $("#businessName").text(profile.business_name || "Not provided");
                $("#profileBusinessName").text(profile.business_name || "Not provided");
                $("#profileEmail").text(profile.email || "Not provided");
                $("#profilePhone").text(profile.phone || "Not provided");
                $("#profileAddress").text(profile.address || "Not provided");
                $("#profileLatitude").text(profile.latitude || "Not available");
                $("#profileLongitude").text(profile.longitude || "Not available");
                $("#profileRole").text(profile.role || "DONOR");
                $("#profileCreatedAt").text(formatDate(profile.created_at));

                $(".profile-card").show();
            },
            error: function (xhr) {
                console.error("donor-profile error:", xhr.responseText);
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
