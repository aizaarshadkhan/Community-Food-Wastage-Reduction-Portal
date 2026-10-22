$(document).ready(function () {


    // =====================================================
    // GET LOGGED-IN USER
    // =====================================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");


    console.log("Logged-in User ID:", userId);
    console.log("Logged-in Role:", role);


    // =====================================================
    // CHECK DONOR LOGIN
    // =====================================================

    if (!userId || !role || role.toUpperCase() !== "DONOR") {

        alert("Please login as a donor first.");

        window.location.href = "login.html";

        return;
    }



    // =====================================================
    // LOAD ALL DONOR FOOD
    // =====================================================

    function loadFoodListings() {

        const tbody = $("#foodTableBody");


        // Loading message

        tbody.html(`
            <tr>
                <td colspan="7">

                    <div class="food-loading">

                        <div class="spinner-border spinner-border-sm me-2">
                        </div>

                        Loading your food listings...

                    </div>

                </td>
            </tr>
        `);



        // =================================================
        // GET FOOD FROM SAME BACKEND AS DONOR DASHBOARD
        // =================================================

        $.ajax({

            url: "BACKEND/food/donor-food.php",

            type: "GET",

            data: {

                donor_id: userId

            },

            dataType: "json",


            success: function (response) {


                console.log("MY FOOD RESPONSE:");
                console.log(response);



                // =================================================
                // CHECK RESPONSE
                // =================================================

                if (!response.success) {

                    tbody.html(`
                        <tr>

                            <td colspan="7">

                                <div class="empty-food">

                                    <i class="bi bi-exclamation-circle d-block"></i>

                                    <p>
                                        ${escapeHtml(
                        response.message ||
                        "Unable to load food listings."
                    )}
                                    </p>

                                </div>

                            </td>

                        </tr>
                    `);

                    return;
                }



                // =================================================
                // CHECK FOOD
                // =================================================

                if (!response.food || response.food.length === 0) {

                    tbody.html(`
                        <tr>

                            <td colspan="7">

                                <div class="empty-food">

                                    <i class="bi bi-basket d-block"></i>

                                    <p>
                                        No food listings yet.
                                    </p>

                                </div>

                            </td>

                        </tr>
                    `);

                    return;
                }



                // =================================================
                // CLEAR TABLE
                // =================================================

                tbody.empty();



                // =================================================
                // ADD EVERY FOOD LISTING
                // =================================================

                response.food.forEach(function (food) {


                    // =============================================
                    // STATUS CLASS
                    // =============================================

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



                    // =============================================
                    // EXPIRY
                    // =============================================

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



                    // =============================================
                    // DROPDOWN MENU
                    // EXACT SAME IDEA AS DONOR DASHBOARD
                    // =============================================

                    let actionMenu = `

                        <div class="dropdown food-options-cell">

                            <button
                                class="food-options-btn"
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

                                        <i class="bi bi-eye"></i>

                                        <span>
                                            View Details
                                        </span>

                                    </a>

                                </li>

                    `;



                    // =============================================
                    // EDIT + DELETE
                    // ONLY AVAILABLE FOOD
                    // =============================================

                    if (food.status === "AVAILABLE") {

                        actionMenu += `

                            <li>

                                <a
                                    class="dropdown-item edit-food-btn"
                                    href="#"
                                    data-food-id="${food.id}">

                                    <i class="bi bi-pencil"></i>

                                    <span>
                                        Edit
                                    </span>

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

                                    <i class="bi bi-trash"></i>

                                    <span>
                                        Delete
                                    </span>

                                </a>

                            </li>

                        `;

                    }



                    // =============================================
                    // MARK DELIVERED
                    // ONLY CLAIMED FOOD
                    // =============================================

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

                                    <i class="bi bi-check-circle"></i>

                                    <span>
                                        Mark as Delivered
                                    </span>

                                </a>

                            </li>

                        `;

                    }



                    // =============================================
                    // CLOSE DROPDOWN
                    // =============================================

                    actionMenu += `

                            </ul>

                        </div>

                    `;



                    // =============================================
                    // CREATE TABLE ROW
                    // =============================================

                    tbody.append(`

                        <tr>


                            <!-- FOOD -->

                            <td>

                                <div class="food-title">

                                    ${food.image ? '<i class="bi bi-image text-success me-1" title="Photo attached"></i>' : ''}${escapeHtml(food.food_title)}

                                </div>

                            </td>



                            <!-- CATEGORY -->

                            <td>

                                ${escapeHtml(
                        food.category || "-"
                    )}

                            </td>



                            <!-- QUANTITY -->

                            <td>

                                ${escapeHtml(
                        food.quantity || "-"
                    )}

                            </td>



                            <!-- STATUS -->

                            <td>

                                <span
                                    class="status ${statusClass}">

                                    ${escapeHtml(
                        food.status || "-"
                    )}

                                </span>

                            </td>



                            <!-- EXPIRY -->

                            <td>

                                ${expiryText}

                            </td>



                            <!-- ADDRESS -->

                            <td>

                                ${escapeHtml(
                        food.pickup_address || "-"
                    )}

                            </td>



                            <!-- OPTIONS -->

                            <td class="food-options-cell">

                                ${actionMenu}

                            </td>


                        </tr>

                    `);

                });

            },


            // =================================================
            // AJAX ERROR
            // =================================================

            error: function (xhr) {

                console.log("MY FOOD PHP ERROR:");

                console.log(xhr.responseText);


                tbody.html(`
                    <tr>

                        <td colspan="7">

                            <div class="empty-food">

                                <i class="bi bi-exclamation-triangle d-block"></i>

                                <p>
                                    Unable to load your food listings.
                                </p>

                            </div>

                        </td>

                    </tr>
                `);

            }

        });

    }



    // =====================================================
    // VIEW DETAILS
    // =====================================================

    $(document).on(
        "click",
        ".view-food-btn",
        function (e) {

            e.preventDefault();


            const foodId = $(this).data("food-id");


            console.log(
                "Opening Food Details:",
                foodId
            );



            // =================================================
            // GET SAME FOOD DATA
            // =================================================

            $.ajax({

                url: "BACKEND/food/donor-food.php",

                type: "GET",

                data: {

                    donor_id: userId

                },

                dataType: "json",


                success: function (response) {


                    if (
                        !response.success ||
                        !response.food
                    ) {

                        alert(
                            "Unable to load food details."
                        );

                        return;
                    }



                    // FIND FOOD

                    const food =
                        response.food.find(
                            function (item) {

                                return String(item.id) ===
                                    String(foodId);

                            }
                        );



                    if (!food) {

                        alert(
                            "Food listing not found."
                        );

                        return;
                    }



                    console.log(
                        "Selected Food:",
                        food
                    );



                    // =================================================
                    // FILL MODAL
                    // =================================================

                    $("#modalFoodTitle")
                        .text(
                            food.food_title || "-"
                        );


                    $("#modalFoodCategory")
                        .text(
                            food.category || "-"
                        );


                    $("#modalFoodQuantity")
                        .text(
                            food.quantity || "-"
                        );


                    $("#modalFoodAddress")
                        .text(
                            food.pickup_address || "-"
                        );


                    // ==========================================
                    // RECEIVER DETAILS
                    // ==========================================

                    if (
                        food.status === "CLAIMED" ||
                        food.status === "DELIVERED"
                    ) {

                        $("#modalReceiverDetails")
                            .text("Food claimed by recipient");

                        $("#modalOrganization")
                            .text(
                                food.ngo_name ||
                                "Not provided"
                            );

                        $("#modalContactPerson")
                            .text(
                                food.contact_person ||
                                "Not provided"
                            );

                        $("#modalPhone")
                            .text(
                                food.recipient_phone ||
                                "Not provided"
                            );

                        $("#modalReceiverAddress")
                            .text(
                                food.recipient_address ||
                                "Not provided"
                            );

                    }
                    else {

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



                    // =================================================
                    // STATUS
                    // =================================================

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
                            "available claimed delivered"
                        )
                        .addClass(statusClass)
                        .text(
                            food.status || "-"
                        );



                    // =================================================
                    // EXPIRY
                    // =================================================

                    let expiryText = "N/A";


                    if (food.expiry_datetime) {

                        const expiry = new Date(
                            food.expiry_datetime.replace(
                                " ",
                                "T"
                            )
                        );


                        if (!isNaN(expiry.getTime())) {

                            expiryText =
                                expiry.toLocaleString(
                                    [],
                                    {
                                        dateStyle: "short",
                                        timeStyle: "short"
                                    }
                                );

                        }

                    }


                    $("#modalFoodExpiry")
                        .text(expiryText);



                    // =================================================
                    // SHOW MODAL
                    // =================================================

                    const modalElement =
                        document.getElementById(
                            "foodDetailsModal"
                        );


                    const modal =
                        bootstrap.Modal.getOrCreateInstance(
                            modalElement
                        );


                    
                    // Photo & feedback
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
                        "FOOD DETAILS ERROR:"
                    );

                    console.log(
                        xhr.responseText
                    );


                    alert(
                        "Unable to load food details."
                    );

                }

            });

        }
    );



    // =====================================================
    // EDIT FOOD
    // =====================================================

    $(document).on(
        "click",
        ".edit-food-btn",
        function (e) {

            e.preventDefault();


            const foodId =
                $(this).data("food-id");


            if (!foodId) {

                alert(
                    "Food ID is missing."
                );

                return;
            }


            window.location.href =
                "edit-food.html?id=" + foodId;

        }
    );



    // =====================================================
    // DELETE FOOD
    // =====================================================

    $(document).on(
        "click",
        ".delete-food-btn",
        function (e) {

            e.preventDefault();


            const foodId =
                $(this).data("food-id");


            if (!foodId) {

                alert(
                    "Food ID is missing."
                );

                return;
            }



            // =================================================
            // CONFIRM
            // =================================================

            const confirmed =
                confirm(
                    "Are you sure you want to delete this food listing?"
                );


            if (!confirmed) {

                return;
            }



            const button = $(this);


            button
                .addClass("disabled")
                .html(`
                    <span
                        class="spinner-border spinner-border-sm me-2">
                    </span>

                    Deleting...
                `);



            // =================================================
            // DELETE REQUEST
            // =================================================

            $.ajax({

                url:
                    "BACKEND/food/delete-food.php",

                type:
                    "POST",

                data: {

                    food_id:
                        foodId,

                    donor_id:
                        userId

                },

                dataType:
                    "json",


                success:
                    function (response) {


                        console.log(
                            "DELETE RESPONSE:",
                            response
                        );


                        if (response.success) {

                            alert(
                                "Food listing deleted successfully."
                            );


                            loadFoodListings();

                        }
                        else {

                            alert(
                                response.message ||
                                "Unable to delete food listing."
                            );

                            loadFoodListings();

                        }

                    },


                error:
                    function (xhr) {


                        console.log(
                            "DELETE PHP ERROR:"
                        );

                        console.log(
                            xhr.responseText
                        );


                        alert(
                            "Something went wrong while deleting the food listing."
                        );


                        loadFoodListings();

                    }

            });

        }
    );



    // =====================================================
    // MARK AS DELIVERED
    // =====================================================

    $(document).on(
        "click",
        ".mark-delivered-btn",
        function (e) {

            e.preventDefault();


            const foodId =
                $(this).data("food-id");


            if (!foodId) {

                alert(
                    "Food ID is missing."
                );

                return;
            }



            const confirmed =
                confirm(
                    "Are you sure this food has been delivered?"
                );


            if (!confirmed) {

                return;
            }



            const button = $(this);


            button
                .addClass("disabled")
                .html(`
                    <span
                        class="spinner-border spinner-border-sm me-2">
                    </span>

                    Updating...
                `);



            // =================================================
            // MARK DELIVERED REQUEST
            // =================================================

            $.ajax({

                url:
                    "BACKEND/food/mark-delivered.php",

                type:
                    "POST",

                data: {

                    food_id:
                        foodId,

                    donor_id:
                        userId

                },

                dataType:
                    "json",


                success:
                    function (response) {


                        console.log(
                            "MARK DELIVERED RESPONSE:",
                            response
                        );


                        if (response.success) {

                            alert(
                                "Food marked as delivered."
                            );


                            loadFoodListings();

                        }
                        else {

                            alert(
                                response.message ||
                                "Unable to mark food as delivered."
                            );


                            loadFoodListings();

                        }

                    },


                error:
                    function (xhr) {


                        console.log(
                            "MARK DELIVERED PHP ERROR:"
                        );

                        console.log(
                            xhr.responseText
                        );


                        alert(
                            "Something went wrong while updating the food."
                        );


                        loadFoodListings();

                    }

            });

        }
    );



    // =====================================================
    // LOGOUT
    // =====================================================

    $("#logoutBtn").click(function (e) {`r`n        e.preventDefault();`r`n        window.location.href = "logout.html";`r`n    });



    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHtml(value) {

        return $("<div>")
            .text(value ?? "")
            .html();

    }



    // =====================================================
    // INITIAL LOAD
    // =====================================================

    loadFoodListings();

});