$(document).ready(function () {

    // ==========================================
    // GET LOGGED-IN USER
    // ==========================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    console.log("Logged-in User ID:", userId);
    console.log("Logged-in Role:", role);


    // ==========================================
    // CHECK DONOR LOGIN
    // ==========================================

    if (!userId || !role || role.toUpperCase() !== "DONOR") {

        alert("Please login as a donor first.");

        window.location.href = "login.html";

        return;
    }


    // ==========================================
    // LOAD DONOR DASHBOARD
    // ==========================================

    function loadDashboard() {

        $.ajax({

            url: "BACKEND/food/donor-food.php",

            type: "GET",

            data: {
                donor_id: userId
            },

            dataType: "json",

            success: function (response) {

                console.log("DONOR FOOD RESPONSE:");
                console.log(response);


                if (!response.success) {

                    alert(
                        response.message ||
                        "Unable to load dashboard."
                    );

                    return;
                }


                // ==========================================
                // UPDATE STATISTICS
                // ==========================================

                $(".stat-card").eq(0).find("h3")
                    .text(response.stats.total);

                $(".stat-card").eq(1).find("h3")
                    .text(response.stats.available);

                $(".stat-card").eq(2).find("h3")
                    .text(response.stats.claimed);

                $(".stat-card").eq(3).find("h3")
                    .text(response.stats.delivered);


                // ==========================================
                // UPDATE FOOD TABLE
                // ==========================================

                const tbody = $(".food-table tbody");

                tbody.empty();


                if (!response.food || response.food.length === 0) {

                    tbody.append(`
                        <tr>
                            <td colspan="5" class="text-center py-4">
                                No food listings yet.
                            </td>
                        </tr>
                    `);

                    return;
                }


                // ==========================================
                // SHOW LATEST 5 FOOD ITEMS
                // ==========================================

                const recentFood = response.food.slice(0, 5);


                // ==========================================
                // CREATE FOOD ROWS
                // ==========================================

                recentFood.forEach(function (food) {

                    let statusClass = "";

                    if (food.status === "AVAILABLE") {
                        statusClass = "available";
                    }
                    else if (food.status === "CLAIMED") {
                        statusClass = "claimed";
                    }
                    else if (food.status === "DELIVERED") {
                        statusClass = "delivered";
                    }
                    else if (food.status === "EXPIRED") {
                        statusClass = "expired";
                    }


                    // ==========================================
                    // FORMAT EXPIRY
                    // ==========================================

                    let expiryText = "N/A";

                    if (food.expiry_datetime) {

                        const expiry = new Date(
                            food.expiry_datetime.replace(" ", "T")
                        );

                        if (!isNaN(expiry.getTime())) {

                            expiryText = expiry.toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short"
                            });

                        }
                    }


                    // ==========================================
                    // BUILD ⋮ DROPDOWN
                    // ==========================================

                    let actionMenu = `

                        <div class="dropdown">

                            <button
                                class="btn btn-sm"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                title="More options">

                                <i class="bi bi-three-dots-vertical"></i>

                            </button>


                            <ul class="dropdown-menu dropdown-menu-end">

                                <!-- VIEW DETAILS -->

                                <li>

                                    <a
                                        class="dropdown-item view-food-btn"
                                        href="#"
                                        data-food-id="${food.id}">

                                        <i class="bi bi-eye me-2"></i>

                                        View Details

                                    </a>

                                </li>
                    `;


                    // ==========================================
                    // EDIT - AVAILABLE ONLY
                    // ==========================================

                    if (food.status === "AVAILABLE") {

                        actionMenu += `

                            <li>

                                <a
                                    class="dropdown-item edit-food-btn"
                                    href="#"
                                    data-food-id="${food.id}">

                                    <i class="bi bi-pencil me-2"></i>

                                    Edit

                                </a>

                            </li>


                            <li>

                                <hr class="dropdown-divider">

                            </li>


                            <li>

                                <a
                                    class="dropdown-item text-danger delete-food-btn"
                                    href="#"
                                    data-food-id="${food.id}">

                                    <i class="bi bi-trash me-2"></i>

                                    Delete

                                </a>

                            </li>

                        `;
                    }


                    // ==========================================
                    // MARK DELIVERED - CLAIMED ONLY
                    // ==========================================

                    if (food.status === "CLAIMED") {

                        actionMenu += `

                            <li>

                                <hr class="dropdown-divider">

                            </li>


                            <li>

                                <a
                                    class="dropdown-item mark-delivered-btn"
                                    href="#"
                                    data-food-id="${food.id}">

                                    <i class="bi bi-check-circle me-2"></i>

                                    Mark as Delivered

                                </a>

                            </li>

                        `;
                    }


                    // ==========================================
                    // CLOSE DROPDOWN
                    // ==========================================

                    actionMenu += `

                            </ul>

                        </div>

                    `;


                    // ==========================================
                    // ADD TABLE ROW
                    // ==========================================

                    tbody.append(`

                        <tr>

                            <td>
                                ${food.image ? '<i class="bi bi-image text-success me-1" title="Photo attached"></i>' : ''}${escapeHtml(food.food_title)}
                            </td>


                            <td>
                                ${escapeHtml(food.quantity)}
                            </td>


                            <td>

                                <span class="status ${statusClass}">

                                    ${escapeHtml(food.status)}

                                </span>

                            </td>


                            <td>
                                ${expiryText}
                            </td>


                            <td>
                                ${actionMenu}
                            </td>

                        </tr>

                    `);

                });

            },


            // ==========================================
            // AJAX ERROR
            // ==========================================

            error: function (xhr) {

                console.log("Dashboard PHP ERROR:");

                console.log(xhr.responseText);

                alert(
                    "Unable to load your dashboard. Check the browser console."
                );

            }

        });

    }


    // =====================================================
    // VIEW DETAILS
    // =====================================================

    $(document).on("click", ".view-food-btn", function (e) {

        e.preventDefault();

        const foodId = $(this).data("food-id");

        console.log("Opening details for Food ID:", foodId);


        if (!foodId) {

            alert("Food ID is missing.");

            return;
        }


        // ==========================================
        // GET FOOD DETAILS
        // ==========================================

        $.ajax({

            url: "BACKEND/food/food-detail.php",

            type: "GET",

            data: {

                food_id: foodId

            },

            dataType: "json",


            success: function (response) {

                console.log("FOOD DETAIL RESPONSE:");
                console.log(response);


                if (!response.success || !response.food) {

                    alert(
                        response.message ||
                        "Unable to load food details."
                    );

                    return;
                }


                const food = response.food;


                console.log("Selected Food:", food);


                // ==========================================
                // FOOD INFORMATION
                // ==========================================

                $("#modalFoodTitle")
                    .text(food.food_title || "-");


                $("#modalFoodCategory")
                    .text(food.category || "-");


                $("#modalFoodQuantity")
                    .text(food.quantity || "-");


                $("#modalFoodAddress")
                    .text(food.pickup_address || "-");


                // ==========================================
                // STATUS
                // ==========================================

                let statusClass = "";


                if (food.status === "AVAILABLE") {

                    statusClass = "available";

                }
                else if (food.status === "CLAIMED") {

                    statusClass = "claimed";

                }
                else if (food.status === "DELIVERED") {

                    statusClass = "delivered";

                }


                $("#modalFoodStatus")
                    .removeClass(
                        "available expired claimed delivered"
                    )
                    .addClass(statusClass)
                    .text(food.status || "-");


                // ==========================================
                // EXPIRY
                // ==========================================

                let expiryText = "N/A";


                if (food.expiry_datetime) {

                    const expiry = new Date(
                        food.expiry_datetime.replace(" ", "T")
                    );


                    if (!isNaN(expiry.getTime())) {

                        expiryText = expiry.toLocaleString([], {

                            dateStyle: "short",

                            timeStyle: "short"

                        });

                    }

                }


                $("#modalFoodExpiry")
                    .text(expiryText);


                // ==========================================
                // RECEIVER DETAILS
                // ==========================================

                const receiverSection =
                    $("#receiverDetailsSection");


                if (
                    food.status === "CLAIMED" ||
                    food.status === "DELIVERED"
                ) {

                    receiverSection.show();


                    const receiver = food.receiver;


                    if (receiver) {

                        $("#modalReceiverDetails")
                            .text("Food claimed by recipient");


                        $("#modalOrganization")
                            .text(
                                receiver.organization ||
                                "Not provided"
                            );


                        $("#modalContactPerson")
                            .text(
                                receiver.contact_person ||
                                "Not provided"
                            );


                        $("#modalPhone")
                            .text(
                                receiver.phone ||
                                "Not provided"
                            );


                        $("#modalReceiverAddress")
                            .text(
                                receiver.address ||
                                "Not provided"
                            );

                    }

                    else {

                        $("#modalReceiverDetails")
                            .text("Receiver information unavailable");


                        $("#modalOrganization")
                            .text("Not provided");


                        $("#modalContactPerson")
                            .text("Not provided");


                        $("#modalPhone")
                            .text("Not provided");


                        $("#modalReceiverAddress")
                            .text("Not provided");

                    }

                }

                else {

                    // ==========================================
                    // FOOD HAS NOT BEEN CLAIMED
                    // ==========================================

                    receiverSection.show();


                    $("#modalReceiverDetails")
                        .text("Not claimed yet");


                    $("#modalOrganization")
                        .text("-");


                    $("#modalContactPerson")
                        .text("-");


                    $("#modalPhone")
                        .text("-");


                    $("#modalReceiverAddress")
                        .text("-");

                }


                // ==========================================
                // OPEN MODAL
                // ==========================================

                const modalElement =
                    document.getElementById(
                        "foodDetailsModal"
                    );


                const modal =
                    bootstrap.Modal.getOrCreateInstance(
                        modalElement
                    );


                
                // FOOD PHOTO & FEEDBACK
                if (food.image) {
                    $("#modalFoodPhoto").attr("src", food.image);
                    $("#modalFoodPhotoContainer").removeClass("d-none");
                } else {
                    $("#modalFoodPhoto").attr("src", "");
                    $("#modalFoodPhotoContainer").addClass("d-none");
                }

                if (food.feedback) {
                    const stars = "⭐".repeat(Number(food.feedback.rating)) + " " + food.feedback.rating + "/5 Stars";
                    $("#modalFeedbackRating").text(stars);
                    $("#modalFeedbackComment").text(food.feedback.comment ? ("\"" + food.feedback.comment + "\"") : "No written comment provided.");
                    $("#modalFeedbackContainer").removeClass("d-none");
                } else {
                    $("#modalFeedbackContainer").addClass("d-none");
                }

                modal.show();

            },


            error: function (xhr) {

                console.log(
                    "Food Details PHP ERROR:"
                );

                console.log(
                    xhr.responseText
                );


                alert(
                    "Unable to load food details."
                );

            }

        });

    });


    // =====================================================
    // EDIT FOOD
    // =====================================================

    $(document).on("click", ".edit-food-btn", function (e) {

        e.preventDefault();

        const foodId = $(this).data("food-id");

        console.log("Edit Food ID:", foodId);


        window.location.href =
            "edit-food.html?id=" + foodId;

    });


    // =====================================================
    // DELETE FOOD
    // =====================================================

    $(document).on("click", ".delete-food-btn", function (e) {

        e.preventDefault();

        const foodId = $(this).data("food-id");


        if (!foodId) {

            alert("Food ID is missing.");

            return;
        }


        // ==========================================
        // CONFIRM DELETE
        // ==========================================

        const confirmed = confirm(
            "Are you sure you want to delete this food listing?"
        );


        if (!confirmed) {

            return;
        }


        const button = $(this);


        button.addClass("disabled");

        button.html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Deleting...
        `);


        // ==========================================
        // DELETE REQUEST
        // ==========================================

        $.ajax({

            url: "BACKEND/food/delete-food.php",

            type: "POST",

            data: {

                food_id: foodId,

                donor_id: userId

            },

            dataType: "json",


            success: function (response) {

                console.log("DELETE FOOD RESPONSE:");

                console.log(response);


                if (response.success) {

                    alert(
                        "Food listing deleted successfully."
                    );

                    loadDashboard();

                }
                else {

                    alert(
                        response.message ||
                        "Unable to delete food listing."
                    );

                }

            },


            error: function (xhr) {

                console.log("DELETE FOOD PHP ERROR:");

                console.log(xhr.responseText);

                alert(
                    "Something went wrong while deleting the food listing."
                );

            }

        });

    });


    // =====================================================
    // MARK AS DELIVERED
    // =====================================================

    $(document).on("click", ".mark-delivered-btn", function (e) {

        e.preventDefault();

        const foodId = $(this).data("food-id");


        if (!foodId) {

            alert("Food ID is missing.");

            return;
        }


        const confirmed = confirm(
            "Are you sure this food has been delivered?"
        );


        if (!confirmed) {

            return;
        }


        const button = $(this);

        button.addClass("disabled");


        button.html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Updating...
        `);


        // ==========================================
        // MARK DELIVERED REQUEST
        // ==========================================

        $.ajax({

            url: "BACKEND/food/mark-delivered.php",

            type: "POST",

            data: {

                food_id: foodId,

                donor_id: userId

            },

            dataType: "json",


            success: function (response) {

                console.log("MARK DELIVERED RESPONSE:");

                console.log(response);


                if (response.success) {

                    alert(
                        "Food marked as delivered."
                    );

                    loadDashboard();

                }
                else {

                    alert(
                        response.message ||
                        "Unable to mark food as delivered."
                    );

                }

            },


            error: function (xhr) {

                console.log(
                    "MARK DELIVERED PHP ERROR:"
                );

                console.log(xhr.responseText);


                alert(
                    "Something went wrong while updating the food."
                );

            }

        });

    });


    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHtml(value) {

        return $("<div>")
            .text(value ?? "")
            .html();

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    $("#logoutBtn").click(function (e) {`r`n        e.preventDefault();`r`n        window.location.href = "logout.html";`r`n    });


    // =====================================================
    // VIEW ALL
    // =====================================================

    $(".food-card .card-header a").click(function (e) {

        e.preventDefault();

        window.location.href = "my-food.html";

    });


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    loadDashboard();

});