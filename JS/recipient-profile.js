$(document).ready(function () {

    // ==========================================
    // GET LOGGED-IN USER
    // ==========================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    console.log("Profile User ID:", userId);
    console.log("Profile Role:", role);


    // ==========================================
    // CHECK LOGIN
    // ==========================================

    if (!userId || !role || role.toUpperCase() !== "RECIPIENT") {

        alert("Please login as a recipient first.");

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

            url: "BACKEND/food/recipient-profile.php",

            type: "GET",

            data: {
                recipient_id: userId
            },

            dataType: "json",

            success: function (response) {

                console.log("PROFILE RESPONSE:");
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
                // DISPLAY PROFILE
                // ==========================================

                $("#ngoName").text(
                    profile.ngo_name || "Not provided"
                );


                $("#profileNgoName").text(
                    profile.ngo_name || "Not provided"
                );


                $("#profileContactPerson").text(
                    profile.contact_person || "Not provided"
                );


                $("#profileEmail").text(
                    profile.email || "Not provided"
                );


                $("#profilePhone").text(
                    profile.phone || "Not provided"
                );


                $("#profileAddress").text(
                    profile.address || "Not provided"
                );


                $("#profileLatitude").text(
                    profile.latitude || "Not available"
                );


                $("#profileLongitude").text(
                    profile.longitude || "Not available"
                );


                $("#profileRole").text(
                    profile.role || "RECIPIENT"
                );


                $("#profileCreatedAt").text(
                    formatDate(profile.created_at)
                );


                // Show profile
                $(".profile-card").show();

            },


            error: function (xhr) {

                console.error(
                    "PROFILE PHP ERROR:"
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

    $("#logoutBtn").click(function (e) {

        e.preventDefault();


        localStorage.removeItem("user_id");

        localStorage.removeItem("role");

        localStorage.removeItem("email");


        window.location.href = "login.html";

    });


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadProfile();

});