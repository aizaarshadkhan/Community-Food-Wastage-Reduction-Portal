/**
 * notifications.js - MealBridge Notification Bell & Dropdown Manager
 * Handles fetching, displaying, and marking user notifications as read.
 */

$(document).ready(function () {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    // Load notification count & list
    function fetchNotifications() {
        $.ajax({
            url: "BACKEND/notifications/get-notifications.php",
            type: "GET",
            data: { user_id: userId },
            dataType: "json",
            success: function (res) {
                if (!res.success) return;

                const count = res.unread_count || 0;
                const badge = $("#notifBadge");
                if (count > 0) {
                    badge.text(count > 99 ? "99+" : count).removeClass("d-none");
                } else {
                    badge.text("0").addClass("d-none");
                }

                renderNotificationList(res.notifications || []);
            },
            error: function () {
                console.warn("Could not fetch notifications.");
            }
        });
    }

    function renderNotificationList(list) {
        const container = $("#notifList");
        if (!container.length) return;

        container.empty();

        if (list.length === 0) {
            container.html(`
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-bell-slash fs-3 d-block mb-2"></i>
                    <p class="mb-0 small">No notifications yet.</p>
                </div>
            `);
            return;
        }

        list.forEach(function (n) {
            const isUnread = String(n.is_read) === "0";
            const bgClass = isUnread ? "bg-light border-start border-4 border-success" : "";
            const timeAgo = formatTime(n.created_at);

            container.append(`
                <div class="p-3 border-bottom notif-item ${bgClass}" data-id="${n.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <strong class="small ${isUnread ? 'text-dark' : 'text-secondary'}">
                            ${isUnread ? '<span class="badge bg-success me-1" style="font-size: 8px;">NEW</span>' : ''}
                            ${escapeHtml(n.title)}
                        </strong>
                        <small class="text-muted" style="font-size: 11px;">${timeAgo}</small>
                    </div>
                    <p class="mb-0 text-muted small mt-1" style="line-height: 1.4;">${escapeHtml(n.message)}</p>
                </div>
            `);
        });
    }

    // Mark all notifications as read
    $(document).on("click", "#markAllReadBtn", function (e) {
        e.preventDefault();
        $.ajax({
            url: "BACKEND/notifications/mark-read.php",
            type: "POST",
            data: { user_id: userId },
            dataType: "json",
            success: function () {
                $("#notifBadge").addClass("d-none").text("0");
                fetchNotifications();
            }
        });
    });

    // Mark single notification as read on click
    $(document).on("click", ".notif-item", function () {
        const notifId = $(this).data("id");
        if (!notifId) return;

        $.ajax({
            url: "BACKEND/notifications/mark-read.php",
            type: "POST",
            data: { user_id: userId, notification_id: notifId },
            dataType: "json",
            success: function () {
                fetchNotifications();
            }
        });
    });

    function formatTime(dateStr) {
        if (!dateStr) return "";
        const d = new Date(String(dateStr).replace(" ", "T"));
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function escapeHtml(text) {
        if (!text) return "";
        return $("<div>").text(text).html();
    }

    // Initial fetch
    fetchNotifications();

    // Check periodically every 25 seconds
    setInterval(fetchNotifications, 25000);
});
