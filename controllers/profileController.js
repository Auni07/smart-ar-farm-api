const pool = require("../config/db");

exports.getProfile = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        birth_year,
        avatar
       FROM users
       WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      message: "Profile retrieved successfully",
      profile: result.rows[0],
    });

  } catch (err) {
    console.error("Get profile error:", err);

    res.status(500).json({
      error: "Unable to retrieve profile",
    });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const {
      id,
      username,
      email,
      birth_year,
      avatar,
    } = req.body;

    // Check required fields
    if (!id || !username || !email || !birth_year || !avatar) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Validate avatar
    if (avatar < 1 || avatar > 8) {
      return res.status(400).json({
        error: "Avatar must be between 1 and 8",
      });
    }

    // Check if user exists
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Check whether username belongs to another user
    const usernameResult = await pool.query(
      `SELECT id
       FROM users
       WHERE username = $1
       AND id != $2`,
      [username, id]
    );

    if (usernameResult.rows.length > 0) {
      return res.status(400).json({
        error: "Username already exists",
      });
    }

    // Check whether email belongs to another user
    const emailResult = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1
       AND id != $2`,
      [email, id]
    );

    if (emailResult.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Update profile
    const result = await pool.query(
      `UPDATE users
       SET username = $1,
           email = $2,
           birth_year = $3,
           avatar = $4
       WHERE id = $5
       RETURNING id, username, email, birth_year, avatar`,
      [
        username,
        email,
        birth_year,
        avatar,
        id,
      ]
    );

    res.json({
      message: "Profile updated successfully",
      profile: result.rows[0],
    });

  } catch (err) {
    console.error("Edit profile error:", err);

    res.status(500).json({
      error: "Unable to update profile",
    });
  }
};

exports.getAchievements = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    // Check whether user exists
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    /*
     * Get all achievements.
     *
     * LEFT JOIN is important because:
     * - Every achievement should be returned
     * - Even if the user has never started it
     * - If no progress record exists, current_value = 0
     */

    const result = await pool.query(
      `SELECT
        a.id AS achievement_id,
        a.achievement_key,
        a.name,
        a.description,
        a.icon,
        a.category,

        COALESCE(ap.current_value, 0) AS current_value,

        ap.updated_at,

        al.id AS level_id,
        al.level_number,
        al.level_name,
        al.description AS level_description,
        al.target_value,
        al.requirement_type,
        al.badge_icon

       FROM achievements a

       LEFT JOIN achievement_progress ap
         ON a.id = ap.achievement_id
         AND ap.user_id = $1

       LEFT JOIN achievement_levels al
         ON a.id = al.achievement_id

       ORDER BY
         CASE a.category
           WHEN 'Getting Started' THEN 1
           WHEN 'Farm Exploration' THEN 2
           WHEN 'Knowledge & Quizzes' THEN 3
           ELSE 4
         END,
         a.id,
         al.level_number`,
      [user_id]
    );

    /*
     * Group achievements by category
     */

    const categories = {};

    result.rows.forEach((row) => {

      // Create category if it does not exist
      if (!categories[row.category]) {
        categories[row.category] = [];
      }

      // Find existing achievement
      let achievement = categories[row.category].find(
        (item) => item.achievement_id === row.achievement_id
      );

      // Create achievement
      if (!achievement) {
        achievement = {
          achievement_id: row.achievement_id,
          achievement_key: row.achievement_key,
          name: row.name,
          description: row.description,
          icon: row.icon,
          current_value: Number(row.current_value),
          updated_at: row.updated_at,
          levels: [],
        };

        categories[row.category].push(achievement);
      }

      // Add level
      if (row.level_id) {
        achievement.levels.push({
          level_id: row.level_id,
          level_number: row.level_number,
          level_name: row.level_name,
          description: row.level_description,
          target_value: row.target_value,
          requirement_type: row.requirement_type,
          badge_icon: row.badge_icon,
          completed:
            Number(row.current_value) >= Number(row.target_value),
        });
      }
    });

    res.json({
      message: "Achievements retrieved successfully",
      categories,
    });

  } catch (err) {
    console.error("Get achievements error:", err);

    res.status(500).json({
      error: "Unable to retrieve achievements",
    });
  }
};

exports.getCompleteBadge = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    // Check whether user exists
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    /*
     * Get only completed achievement levels.
     *
     * An achievement level is completed when:
     * current_value >= target_value
     */

    const result = await pool.query(
      `SELECT
        a.id AS achievement_id,
        a.achievement_key,
        a.name,
        a.description,
        a.icon,
        a.category,

        COALESCE(ap.current_value, 0) AS current_value,

        ap.updated_at,

        al.id AS level_id,
        al.level_number,
        al.level_name,
        al.description AS level_description,
        al.target_value,
        al.requirement_type,
        al.badge_icon

       FROM achievements a

       INNER JOIN achievement_progress ap
         ON a.id = ap.achievement_id
         AND ap.user_id = $1

       INNER JOIN achievement_levels al
         ON a.id = al.achievement_id

       WHERE
         COALESCE(ap.current_value, 0) >= al.target_value

       ORDER BY
         CASE a.category
           WHEN 'Getting Started' THEN 1
           WHEN 'Farm Exploration' THEN 2
           WHEN 'Knowledge & Quizzes' THEN 3
           ELSE 4
         END,
         a.id,
         al.level_number`,
      [user_id]
    );

    /*
     * Group completed badges by category
     */

    const categories = {};

    result.rows.forEach((row) => {
      // Create category if it does not exist
      if (!categories[row.category]) {
        categories[row.category] = [];
      }

      categories[row.category].push({
        achievement_id: row.achievement_id,
        achievement_key: row.achievement_key,
        name: row.name,
        level_id: row.level_id,
        level_number: row.level_number,
        level_name: row.level_name,
        badge_icon: row.badge_icon,
        completed: true,
        completed_value: Number(row.current_value),
        target_value: Number(row.target_value),
        completed_at: row.updated_at,
      });
    });

    res.json({
      message: "Completed badges retrieved successfully",
      categories,
    });

  } catch (err) {
    console.error("Get complete badges error:", err);

    res.status(500).json({
      error: "Unable to retrieve completed badges",
    });
  }
};