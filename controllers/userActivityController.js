const pool = require("../config/db");

exports.getAllActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ua.id,
        ua.user_id,
        ua.plant_id,
        ua.activity_type,
        ua.created_at,

        p.common_name AS plant_name,
        p.botanical_name,
        p.family_name

      FROM user_activity ua
      LEFT JOIN plants p ON ua.plant_id = p.id
      ORDER BY ua.created_at DESC
    `);

    res.json({
      total: result.rowCount,
      activities: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all activities
exports.getAllActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ua.id,
        ua.user_id,
        ua.plant_id,
        ua.activity_type,
        ua.created_at,

        p.common_name AS plant_name,
        p.botanical_name,
        p.family_name

      FROM user_activity ua
      LEFT JOIN plants p ON ua.plant_id = p.id
      ORDER BY ua.created_at DESC
    `);

    res.json({
      total: result.rowCount,
      activities: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new activity
exports.createActivity = async (req, res) => {
  try {
    const { user_id, plant_id, activity_type } = req.body;

    if (!user_id || !activity_type) {
      return res.status(400).json({
        error: "user_id and activity_type are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [user_id, plant_id || null, activity_type]
    );

    res.status(201).json({
      message: "Activity created successfully",
      activity: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
