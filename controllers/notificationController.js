const pool = require("../config/db");

// Get notifications for a specific user
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Create notification for a specific user
exports.createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        error: "user_id, title and message are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications
       (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        user_id,
        title,
        message,
        type || "general"
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// Create notification for all current users
exports.createNotificationForAllUsers = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: "title and message are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications
       (user_id, title, message, type)
       SELECT id, $1, $2, $3
       FROM users
       RETURNING *`,
      [
        title,
        message,
        type || "general"
      ]
    );

    res.status(201).json({
      message: "Notification sent to all users",
      count: result.rows.length,
      notifications: result.rows
    });

  } catch (error) {
    console.error("Error creating notification for all users:", error);

    res.status(500).json({
      error: "Failed to create notification for all users"
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Notification not found"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      error: "Failed to mark notification as read"
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Notification not found"
      });
    }

    res.json({
      message: "Notification deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      error: "Failed to delete notification"
    });
  }
};