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

exports.getAllUniqueNotifications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (title, message, type)
        id,
        title,
        message,
        type,
        created_at
      FROM notifications
      ORDER BY title, message, type, created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching unique notifications:", error);

    res.status(500).json({
      error: "Failed to fetch unique notifications"
    });
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

exports.createNotificationToAllUsers = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: "title and message are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO notifications
        (user_id, title, message, type)
      SELECT
        id,
        $1,
        $2,
        $3
      FROM users
      RETURNING *
      `,
      [
        title,
        message,
        type || "general"
      ]
    );

    res.status(201).json({
      message: "Notification pushed to all users",
      count: result.rows.length
    });

  } catch (error) {
    console.error(
      "Error pushing notification to all users:",
      error
    );

    res.status(500).json({
      error: "Failed to push notification to all users"
    });
  }
};

exports.createNotificationToNewUsers = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: "title and message are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO notifications
        (user_id, title, message, type)
      SELECT
        id,
        $1,
        $2,
        $3
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      RETURNING *
      `,
      [
        title,
        message,
        type || "general"
      ]
    );

    res.status(201).json({
      message: "Notification pushed to users who joined within the last 7 days",
      count: result.rows.length
    });

  } catch (error) {
    console.error(
      "Error pushing notification to new users:",
      error
    );

    res.status(500).json({
      error: "Failed to push notification to new users"
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