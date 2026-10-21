$(document).ready(function () {


    // =====================================================
    // GET LOGGED-IN USER
    // =====================================================

    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");


    console.log("Logged-in User ID:", userId);
    console.log("Logged-in Role:", role);



    // =====================================================
    // CHECK LOGIN
    // =====================================================

    if (!userId || !role || role.toUpperCase() !== "DONOR") {

        alert("Please login as a donor first.");

        window.location.href = "login.html";

        return;
    }



    // =====================================================
    // GET FOOD ID FROM URL
    // =====================================================

    const urlParams = new URLSearchParams(
        window.location.search
    );

    const foodId = urlParams.get("id");


    console.log("Editing Food ID:", foodId);



    if (!foodId) {

        alert("Food listing ID is missing.");

        window.location.href = "my-food.html";

        return;
    }



    // =====================================================
    // LOAD FOOD
    // =====================================================

    function loadFood() {

        $("#editFoodForm").addClass("loading");


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


                if (!response.success || !response.food) {

                    showError(
                        response.message ||
                        "Unable to load food listing."
                    );

                    return;
                }


                // =================================================
                // FIND FOOD
                // =================================================

                const food = response.food.find(function (item) {

                    return String(item.id) === String(foodId);

                });


                if (!food) {

                    showError(
                        "Food listing was not found."
                    );

                    return;
                }


                console.log("Selected Food:");
                console.log(food);



                // =================================================
                // ONLY AVAILABLE FOOD CAN BE EDITED
                // =================================================

                if (
                    food.status &&
                    food.status.toUpperCase() !== "AVAILABLE"
                ) {

                    showError(
                        "Only AVAILABLE food listings can be edited."
                    );

                    $("#editFoodForm")
                        .find("input, select, textarea, button")
                        .prop("disabled", true);

                    return;
                }



                // =================================================
                // FILL FORM
                // =================================================

                $("#foodTitle")
                    .val(food.food_title || "");


                $("#category")
                    .val(food.category || "");


                $("#quantity")
                    .val(food.quantity || "");


                $("#pickupAddress")
                    .val(food.pickup_address || "");


                $("#latitude")
                    .val(food.latitude || "");


                $("#longitude")
                    .val(food.longitude || "");


                updateLocationDisplay(
                    food.latitude,
                    food.longitude
                );


                // =================================================
                // EXPIRY
                // =================================================

                if (food.expiry_datetime) {

                    $("#expiryDatetime")
                        .val(
                            convertToDatetimeLocal(
                                food.expiry_datetime
                            )
                        );

                }



                // =================================================
                // STATUS
                // =================================================

                updateStatus(
                    food.status || "AVAILABLE"
                );



                // =================================================
                // PREVIEW
                // =================================================

                updatePreview();


            },


            error: function (xhr) {

                console.log(
                    "LOAD FOOD ERROR:"
                );

                console.log(xhr.responseText);


                showError(
                    "Unable to load food listing."
                );

            },


            complete: function () {

                $("#editFoodForm")
                    .removeClass("loading");

            }

        });

    }



    // =====================================================
    // CONVERT DATETIME
    // =====================================================

    function convertToDatetimeLocal(dateString) {

        if (!dateString) {
            return "";
        }


        let date = new Date(
            dateString.replace(" ", "T")
        );


        if (isNaN(date.getTime())) {
            return "";
        }


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");


        const day =
            String(
                date.getDate()
            ).padStart(2, "0");


        const hours =
            String(
                date.getHours()
            ).padStart(2, "0");


        const minutes =
            String(
                date.getMinutes()
            ).padStart(2, "0");


        return (
            year +
            "-" +
            month +
            "-" +
            day +
            "T" +
            hours +
            ":" +
            minutes
        );

    }



    // =====================================================
    // STATUS
    // =====================================================

    function updateStatus(status) {

        const statusElement =
            $("#currentStatus");


        statusElement
            .removeClass(
                "available claimed delivered"
            );


        if (status === "AVAILABLE") {

            statusElement
                .addClass("available");

            statusElement
                .text("AVAILABLE");

            $("#statusMessage")
                .text(
                    "This listing can be edited."
                );

        }

        else if (status === "CLAIMED") {

            statusElement
                .addClass("claimed");

            statusElement
                .text("CLAIMED");

            $("#statusMessage")
                .text(
                    "Claimed food cannot be edited."
                );

        }

        else if (status === "DELIVERED") {

            statusElement
                .addClass("delivered");

            statusElement
                .text("DELIVERED");

            $("#statusMessage")
                .text(
                    "Delivered food cannot be edited."
                );

        }

        else {

            statusElement
                .text(status);

        }

    }



    // =====================================================
    // LOCATION DISPLAY
    // =====================================================

    function updateLocationDisplay(
        latitude,
        longitude
    ) {

        if (latitude) {

            $("#latitudeDisplay")
                .text(latitude);

        }
        else {

            $("#latitudeDisplay")
                .text("-");

        }


        if (longitude) {

            $("#longitudeDisplay")
                .text(longitude);

        }
        else {

            $("#longitudeDisplay")
                .text("-");

        }

    }



    // =====================================================
    // UPDATE PREVIEW
    // =====================================================

    function updatePreview() {


        const title =
            $("#foodTitle").val().trim();


        const category =
            $("#category").val();


        const quantity =
            $("#quantity").val();


        const address =
            $("#pickupAddress").val().trim();



        $("#previewTitle")
            .text(
                title || "Food Listing"
            );


        $("#previewCategory")
            .text(
                category || "Category"
            );


        $("#previewQuantity")
            .text(
                quantity ?
                quantity :
                "-"
            );


        $("#previewAddress")
            .text(
                address ?
                address :
                "-"
            );

    }



    // =====================================================
    // UPDATE PREVIEW WHEN FORM CHANGES
    // =====================================================

    $("#foodTitle").on(
        "input",
        updatePreview
    );


    $("#category").on(
        "change",
        updatePreview
    );


    $("#quantity").on(
        "input",
        updatePreview
    );


    $("#pickupAddress").on(
        "input",
        updatePreview
    );



    // =====================================================
    // GET CURRENT LOCATION
    // =====================================================

    $("#locationBtn").click(function () {


        if (!navigator.geolocation) {

            showError(
                "Geolocation is not supported by your browser."
            );

            return;
        }



        const button = $(this);


        button
            .prop("disabled", true);


        button.html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Getting Location...
        `);



        navigator.geolocation.getCurrentPosition(

            function (position) {


                const latitude =
                    position.coords.latitude;


                const longitude =
                    position.coords.longitude;



                $("#latitude")
                    .val(latitude);


                $("#longitude")
                    .val(longitude);



                updateLocationDisplay(
                    latitude,
                    longitude
                );


                button
                    .prop("disabled", false);


                button.html(`
                    <i class="bi bi-check-circle"></i>
                    Location Updated
                `);


                setTimeout(function () {

                    button.html(`
                        <i class="bi bi-crosshair"></i>
                        Update My Location
                    `);

                }, 2000);

            },


            function (error) {

                console.log(
                    "LOCATION ERROR:",
                    error
                );


                button
                    .prop("disabled", false);


                button.html(`
                    <i class="bi bi-crosshair"></i>
                    Update My Location
                `);


                showError(
                    "Unable to get your current location. Please allow location access."
                );

            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    });



    // =====================================================
    // SUBMIT FORM
    // =====================================================

    $("#editFoodForm").submit(function (e) {

        e.preventDefault();


        hideMessages();



        const foodTitle =
            $("#foodTitle")
                .val()
                .trim();


        const category =
            $("#category")
                .val();


        const quantity =
            $("#quantity")
                .val();


        const pickupAddress =
            $("#pickupAddress")
                .val()
                .trim();


        const latitude =
            $("#latitude")
                .val();


        const longitude =
            $("#longitude")
                .val();


        const expiryDatetime =
            $("#expiryDatetime")
                .val();



        // =================================================
        // VALIDATION
        // =================================================

        if (!foodTitle) {

            showError(
                "Please enter the food title."
            );

            $("#foodTitle").focus();

            return;
        }


        if (!category) {

            showError(
                "Please select a food category."
            );

            $("#category").focus();

            return;
        }


        if (!quantity || Number(quantity) <= 0) {

            showError(
                "Please enter a valid quantity."
            );

            $("#quantity").focus();

            return;
        }


        if (!pickupAddress) {

            showError(
                "Please enter the pickup address."
            );

            $("#pickupAddress").focus();

            return;
        }


        if (!latitude || !longitude) {

            showError(
                "Please provide the pickup location."
            );

            return;
        }


        if (!expiryDatetime) {

            showError(
                "Please select an expiry date and time."
            );

            $("#expiryDatetime").focus();

            return;
        }



        // =================================================
        // CHECK EXPIRY
        // =================================================

        const expiryDate =
            new Date(expiryDatetime);


        if (
            isNaN(expiryDate.getTime())
        ) {

            showError(
                "Please enter a valid expiry date and time."
            );

            return;
        }



        // =================================================
        // SAVE BUTTON
        // =================================================

        const saveButton =
            $("#saveBtn");


        saveButton
            .prop("disabled", true);


        saveButton.html(`
            <span class="spinner-border spinner-border-sm me-2"></span>
            Saving...
        `);



        // =================================================
        // UPDATE REQUEST
        // =================================================

        $.ajax({

            url: "BACKEND/food/update-food.php",

            type: "POST",

            data: {

                food_id: foodId,

                donor_id: userId,

                food_title: foodTitle,

                category: category,

                quantity: quantity,

                pickup_address: pickupAddress,

                latitude: latitude,

                longitude: longitude,

                expiry_datetime: expiryDatetime

            },

            dataType: "json",


            success: function (response) {

                console.log(
                    "UPDATE FOOD RESPONSE:"
                );

                console.log(response);



                if (response.success) {


                    showSuccess(
                        response.message ||
                        "Food listing updated successfully."
                    );


                    saveButton.html(`
                        <i class="bi bi-check-circle"></i>
                        Saved
                    `);



                    setTimeout(function () {

                        window.location.href =
                            "my-food.html";

                    }, 1000);

                }

                else {

                    showError(
                        response.message ||
                        "Unable to update food listing."
                    );


                    saveButton
                        .prop("disabled", false);


                    saveButton.html(`
                        <i class="bi bi-check-lg"></i>
                        Save Changes
                    `);

                }

            },


            error: function (xhr) {

                console.log(
                    "UPDATE FOOD PHP ERROR:"
                );

                console.log(
                    xhr.responseText
                );


                showError(
                    "Something went wrong while updating the food listing."
                );


                saveButton
                    .prop("disabled", false);


                saveButton.html(`
                    <i class="bi bi-check-lg"></i>
                    Save Changes
                `);

            }

        });

    });



    // =====================================================
    // ERROR MESSAGE
    // =====================================================

    function showError(message) {

        $("#formSuccess")
            .addClass("d-none")
            .text("");


        $("#formError")
            .removeClass("d-none")
            .text(message);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }



    // =====================================================
    // SUCCESS MESSAGE
    // =====================================================

    function showSuccess(message) {

        $("#formError")
            .addClass("d-none")
            .text("");


        $("#formSuccess")
            .removeClass("d-none")
            .text(message);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }



    // =====================================================
    // HIDE MESSAGES
    // =====================================================

    function hideMessages() {

        $("#formError")
            .addClass("d-none")
            .text("");


        $("#formSuccess")
            .addClass("d-none")
            .text("");

    }



    // =====================================================
    // LOGOUT
    // =====================================================

    $("#logoutBtn").click(function (e) {

        e.preventDefault();


        localStorage.removeItem("user_id");

        localStorage.removeItem("role");

        localStorage.removeItem("email");


        window.location.href =
            "login.html";

    });



    // =====================================================
    // INITIAL LOAD
    // =====================================================

    loadFood();

});