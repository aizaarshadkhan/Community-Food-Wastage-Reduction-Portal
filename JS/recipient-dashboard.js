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

                console.log("AVAILABLE FOOD RESPONSE:");
                console.log(response);


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

                console.log("AVAILABLE FOOD PHP ERROR:");
                console.log(xhr.responseText);


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
    // DISPLAY FOOD
    // ==========================================

    function displayFood(foodList) {

        const foodGrid = $("#foodGrid");

        foodGrid.empty();


        // No food available
        if (!foodList || foodList.length === 0) {

            foodGrid.html(`
                <div class="col-12">

                    <div class="text-center py-5">

                        <i
                            class="fa-solid fa-utensils mb-3"
                            style="font-size: 45px; color: #6c757d;"
                        ></i>

                        <h5>
                            No food available
                        </h5>

                        <p class="text-muted">
                            There are currently no available food donations.
                        </p>

                    </div>

                </div>
            `);

            return;
        }


        // Create food cards
        foodList.forEach(function (food) {

            const expiryText = formatDate(food.expiry_datetime);

            const categoryText =
                food.category === "NON_VEG"
                    ? "Non-Veg"
                    : "Veg";


            const categoryClass =
                food.category === "NON_VEG"
                    ? "text-danger"
                    : "text-success";


            foodGrid.append(`

                <div class="col-12 col-md-6 col-xl-4 food-item">

                    <div class="card h-100 shadow-sm border-0">

                        <div class="card-body">

                            <div class="d-flex justify-content-between align-items-start mb-3">

                                <h5 class="card-title mb-0">
                                    ${escapeHtml(food.food_title)}
                                </h5>

                                <span class="${categoryClass}">
                                    <i class="fa-solid fa-circle"></i>
                                    ${categoryText}
                                </span>

                            </div>


                            <p class="text-muted mb-2">
                                <i class="fa-solid fa-box"></i>

                                Quantity:
                                <strong>
                                    ${escapeHtml(food.quantity)}
                                </strong>

                            </p>


                            <p class="text-muted mb-2">
                                <i class="bi bi-geo-alt"></i>
                                ${escapeHtml(food.pickup_address)}
                            </p>

                            <p class="text-muted mb-3">
                                <i class="bi bi-signpost-2"></i>
                                <strong>
                                    ${escapeHtml(food.distance_km)}
                                </strong>
                                km away
                            </p>


                            <p class="text-muted mb-3">
                                <i class="fa-regular fa-clock"></i>
                                Expires:
                                ${expiryText}
                            </p>


                            <button
                                type="button"
                                class="btn btn-primary w-100 claim-food-btn"
                                data-food-id="${food.id}"
                            >

                                <i class="fa-solid fa-hand-holding-heart"></i>

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

        const searchText =
            $("#foodSearch")
                .val()
                .trim()
                .toLowerCase();


        if (searchText === "") {

            displayFood(availableFood);

            return;
        }


        const filteredFood = availableFood.filter(function (food) {

            const title =
                String(food.food_title || "").toLowerCase();

            const category =
                String(food.category || "").toLowerCase();

            const address =
                String(food.pickup_address || "").toLowerCase();


            return (
                title.includes(searchText) ||
                category.includes(searchText) ||
                address.includes(searchText)
            );

        });


        displayFood(filteredFood);

    }

    // ==========================================
    // SEARCH BUTTON
    // ==========================================

    $("#searchBtn").click(function () {

        searchFood();

    });
    
    
    // ==========================================
    // RADIUS FILTER
    // ==========================================

    $("#radiusFilter").on("change", function () {

        loadAvailableFood();

    });


    // ==========================================
    // SEARCH WHILE TYPING
    // ==========================================

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


        // Prevent double clicking
        button.prop("disabled", true);

        button.html(`
            <span class="spinner-border spinner-border-sm"></span>
            Claiming...
        `);


        $.ajax({

            url: "BACKEND/food/claim-food.php",

            type: "POST",

            data: {

                food_id: foodId,

                recipient_id: userId

            },

            dataType: "json",


            success: function (response) {

                console.log("CLAIM FOOD RESPONSE:");
                console.log(response);


                if (response.success) {

                    alert("Food claimed successfully!");


                    // Reload available food
                    loadAvailableFood();


                    // Reload claims
                    loadMyClaims();

                }

                else {

                    alert(
                        response.message ||
                        "Unable to claim this food."
                    );


                    button.prop("disabled", false);

                    button.html(originalText);

                }

            },


            error: function (xhr) {

                console.log("CLAIM FOOD PHP ERROR:");
                console.log(xhr.responseText);


                alert(
                    "Something went wrong while claiming the food."
                );


                button.prop("disabled", false);

                button.html(originalText);

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

            data: {
                recipient_id: userId
            },

            dataType: "json",

            success: function (response) {

                console.log("=================================");
                console.log("MY CLAIMS API RESPONSE");
                console.log(response);
                console.log("=================================");

                $("#claimsLoading").hide();


                // Check API success
                if (!response.success) {

                    console.error(
                        "Claims API Error:",
                        response.message
                    );

                    $("#claimsGrid").html(`
                    <div class="col-12">

                        <div class="alert alert-danger">

                            ${escapeHtml(
                        response.message ||
                        "Unable to load claims."
                    )}

                        </div>

                    </div>
                `);

                    return;
                }


                // Get claims
                const claims = Array.isArray(response.claims)
                    ? response.claims
                    : [];


                console.log("Claims received:", claims);

                console.log(
                    "Number of claims:",
                    claims.length
                );


                // Update statistics
                if (response.stats) {

                    $("#claimedCount").text(
                        response.stats.claimed || 0
                    );

                    $("#deliveredCount").text(
                        response.stats.delivered || 0
                    );

                } else {

                    $("#claimedCount").text(
                        claims.length
                    );

                    $("#deliveredCount").text(0);

                }


                // Display claims
                displayClaims(claims);

            },


            error: function (xhr, status, error) {

                console.error(
                    "================================="
                );

                console.error(
                    "RECIPIENT CLAIMS AJAX ERROR"
                );

                console.error(
                    "Status:",
                    status
                );

                console.error(
                    "Error:",
                    error
                );

                console.error(
                    "HTTP Status:",
                    xhr.status
                );

                console.error(
                    "Response:",
                    xhr.responseText
                );

                console.error(
                    "================================="
                );


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
    // DISPLAY CLAIMS
    // ==========================================

    function displayClaims(claims) {

        const claimsGrid = $("#claimsGrid");


        console.log("Displaying claims:", claims);


        // Clear old content
        claimsGrid.empty();


        // No claims
        if (!Array.isArray(claims) || claims.length === 0) {

            claimsGrid.html(`

            <div class="col-12">

                <div class="text-center py-5">

                    <i
                        class="bi bi-hand-thumbs-up"
                        style="
                            font-size: 45px;
                            color: #6c757d;
                        "
                    ></i>

                    <h5 class="mt-3">
                        No claims yet
                    </h5>

                    <p class="text-muted">
                        Food you claim will appear here.
                    </p>

                </div>

            </div>

        `);

            return;
        }


        // Create claim cards
        claims.forEach(function (claim) {

            console.log("Displaying claim:", claim);


            const status =
                String(claim.status || "CLAIMED").toUpperCase();


            let statusClass = "bg-primary";


            if (status === "DELIVERED") {

                statusClass = "bg-success";

            }


            claimsGrid.append(`

            <div class="col-12 col-md-6 col-xl-4">

                <div class="card h-100 shadow-sm border-0">

                    <div class="card-body">


                        <div
                            class="d-flex
                                   justify-content-between
                                   align-items-start
                                   mb-3"
                        >

                            <h5 class="card-title mb-0">

                                ${escapeHtml(
                claim.food_title ||
                "Food Donation"
            )}

                            </h5>


                            <span class="badge ${statusClass}">

                                ${escapeHtml(status)}

                            </span>

                        </div>


                        <p class="text-muted mb-2">

                            <i class="bi bi-box"></i>

                            Quantity:

                            <strong>

                                ${escapeHtml(
                claim.quantity ?? "N/A"
            )}

                            </strong>

                        </p>


                        <p class="text-muted mb-2">

                            <i class="bi bi-geo-alt"></i>

                            ${escapeHtml(
                claim.pickup_address ||
                "Address unavailable"
            )}

                        </p>


                        <p class="text-muted mb-2">

                            <i class="bi bi-tag"></i>

                            Category:

                            ${escapeHtml(
                claim.category ||
                "N/A"
            )}

                        </p>


                        <p class="text-muted mb-0">

                            <i class="bi bi-clock"></i>

                            Claimed:

                            ${formatDate(
                claim.claimed_at
            )}

                        </p>


                        ${claim.delivered_at
                    ? `
                                <p class="text-muted mt-2 mb-0">

                                    <i class="bi bi-check-circle"></i>

                                    Delivered:

                                    ${formatDate(
                        claim.delivered_at
                    )}

                                </p>
                              `
                    : ""
                }


                    </div>

                </div>

            </div>

        `);

        });

    }


    // ==========================================
    // FORMAT DATE
    // ==========================================

    function formatDate(dateString) {

        if (!dateString) {

            return "N/A";

        }


        const date =
            new Date(
                String(dateString).replace(" ", "T")
            );


        if (isNaN(date.getTime())) {

            return escapeHtml(dateString);

        }


        return date.toLocaleString([], {

            dateStyle: "medium",

            timeStyle: "short"

        });

    }


    // ==========================================
    // HTML ESCAPE
    // ==========================================

    function escapeHtml(value) {

        return $("<div>")
            .text(value ?? "")
            .html();

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
    // LOAD RECIPIENT PROFILE
    // ==========================================

    function loadProfile() {

        console.log("Loading recipient profile:", userId);


        $("#profileLoading").show();

        $("#profileContent").hide();

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
                        .show()
                        .find(".alert")
                        .text(
                            response.message ||
                            "Unable to load your profile."
                        );

                    return;
                }


                const profile = response.profile;


                // ==========================================
                // DISPLAY PROFILE
                // ==========================================

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
                $("#profileContent").show();

            },


            error: function (xhr) {

                console.error(
                    "PROFILE PHP ERROR:"
                );

                console.error(
                    xhr.responseText
                );


                $("#profileLoading").hide();

                $("#profileError").show();

            }

        });

    }

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadAvailableFood();

    loadMyClaims();

    loadProfile();

});