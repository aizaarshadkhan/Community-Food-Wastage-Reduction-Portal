$(document).ready(function () {

    // ==========================================
    // GET LOGGED-IN USER
    // ==========================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    console.log("Donor Profile User ID:", userId);
    console.log("Donor Profile Role:", role);


    // ==========================================
    // CHECK DONOR LOGIN
    // ==========================================

    if (!userId || !role || role.toUpperCase() !== "DONOR") {

        alert("Please login as a donor first.");

        window.location.href = "login.html";

        return;
    }


    // ==========================================
    // LOAD PROFILE
    // ==========================================

    function loadProfile() {

        $("#profileLoading").show();

        $("#profileError").hide();


        $.ajax({

            url: "BACKEND/food/donor-profile.php",

            type: "GET",

            data: {
                donor_id: userId
            },

            dataType: "json",


            success: function (response) {

                console.log("DONOR PROFILE RESPONSE:");
                console.log(response);


                $("#profileLoading").hide();


                if (!response.success) {

                    $("#profileError")
                        .text(
                            response.message ||
                            "Unable to load your profile."
                        )
                        .show();

                    return;
                }


                const profile = response.profile;


                // ==========================================
                // BUSINESS NAME
                // ==========================================

                $("#businessName").text(
                    profile.business_name || "Not provided"
                );


                $("#profileBusinessName").text(
                    profile.business_name || "Not provided"
                );


                // ==========================================
                // EMAIL
                // ==========================================

                $("#profileEmail").text(
                    profile.email || "Not provided"
                );


                // ==========================================
                // PHONE
                // ==========================================

                $("#profilePhone").text(
                    profile.phone || "Not provided"
                );


                // ==========================================
                // ADDRESS
                // ==========================================

                $("#profileAddress").text(
                    profile.address || "Not provided"
                );


                // ==========================================
                // LOCATION
                // ==========================================

                $("#profileLatitude").text(
                    profile.latitude || "Not available"
                );


                $("#profileLongitude").text(
                    profile.longitude || "Not available"
                );


                // ==========================================
                // ACCOUNT TYPE
                // ==========================================

                $("#profileRole").text(
                    profile.role || "DONOR"
                );


                // ==========================================
                // MEMBER SINCE
                // ==========================================

                $("#profileCreatedAt").text(
                    formatDate(profile.created_at)
                );


                // Show profile
                $(".profile-card").show();

            },


            error: function (xhr) {

                console.error(
                    "DONOR PROFILE PHP ERROR:"
                );

                console.error(
                    xhr.responseText
                );


                $("#profileLoading").hide();


                $("#profileError")
                    .text(
                        "Unable to connect to the profile server."
                    )
                    .show();

            }

        });

    }


    // ==========================================
    // FORMAT DATE
    // ==========================================

    function formatDate(dateString) {

        if (!dateString) {

            return "Not available";

        }


        const date = new Date(
            String(dateString).replace(" ", "T")
        );


        if (isNaN(date.getTime())) {

            return dateString;

        }


        return date.toLocaleDateString([], {

            year: "numeric",

            month: "long",

            day: "numeric"

        });

    }


    // ==========================================
    // LOGOUT
    // ==========================================

    $("#logoutBtn").click(function (e) {`r`n        e.preventDefault();`r`n        window.location.href = "logout.html";`r`n    });


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadProfile();

});