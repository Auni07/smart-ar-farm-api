const pool = require("../config/db");

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

exports.getQuizAchievements = async (req, res) => {
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
     * Quiz achievement IDs:
     * 10 = general_quiz
     * 11 = perfect_quiz
     * 12 = plant_quiz
     * 13 = ar_experience_quiz
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

       WHERE a.id IN (10, 11, 12, 13)

       ORDER BY
         a.id,
         al.level_number`,
      [user_id]
    );

    /*
     * Group the results by achievement
     */

    const achievements = {};

    result.rows.forEach((row) => {
      if (!achievements[row.achievement_key]) {
        achievements[row.achievement_key] = {
          achievement_id: row.achievement_id,
          achievement_key: row.achievement_key,
          name: row.name,
          description: row.description,
          icon: row.icon,
          category: row.category,

          current_value: Number(row.current_value),
          updated_at: row.updated_at,

          levels: [],
        };
      }

      if (row.level_id) {
        achievements[row.achievement_key].levels.push({
          level_id: row.level_id,
          level_number: row.level_number,
          level_name: row.level_name,
          description: row.level_description,
          target_value: Number(row.target_value),
          requirement_type: row.requirement_type,
          badge_icon: row.badge_icon,

          completed:
            Number(row.current_value) >= Number(row.target_value),
        });
      }
    });

    res.json({
      message: "Quiz achievements retrieved successfully",
      achievements,
    });

  } catch (err) {
    console.error("Get quiz achievements error:", err);

    res.status(500).json({
      error: "Unable to retrieve quiz achievements",
    });
  }
};

exports.getAchievementById = async (req, res) => {
  try {
    const { achievement_id } = req.params;
    const { user_id } = req.query;

    // Validate user ID
    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    // Validate achievement ID
    if (
      !Number.isInteger(Number(achievement_id)) ||
      Number(achievement_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid Achievement ID is required",
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

    // Get achievement and user's progress
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

       WHERE a.id = $2

       ORDER BY al.level_number`,
      [user_id, achievement_id]
    );

    // Achievement does not exist
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Achievement not found",
      });
    }

    const firstRow = result.rows[0];

    const achievement = {
      achievement_id: firstRow.achievement_id,
      achievement_key: firstRow.achievement_key,
      name: firstRow.name,
      description: firstRow.description,
      icon: firstRow.icon,
      category: firstRow.category,

      current_value: Number(firstRow.current_value),
      updated_at: firstRow.updated_at,

      levels: [],
    };

    // Add achievement levels
    result.rows.forEach((row) => {
      if (row.level_id) {
        achievement.levels.push({
          level_id: row.level_id,
          level_number: row.level_number,
          level_name: row.level_name,
          description: row.level_description,
          target_value: Number(row.target_value),
          requirement_type: row.requirement_type,
          badge_icon: row.badge_icon,

          completed:
            Number(row.current_value) >= Number(row.target_value),
        });
      }
    });

    res.json({
      message: "Achievement retrieved successfully",
      achievement,
    });

  } catch (err) {
    console.error("Get achievement by ID error:", err);

    res.status(500).json({
      error: "Unable to retrieve achievement",
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