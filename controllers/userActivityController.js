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

      LEFT JOIN plants p
        ON ua.plant_id = p.id

      ORDER BY ua.created_at DESC
    `);

    res.json({
      total: result.rowCount,
      activities: result.rows,
    });

  } catch (err) {
    console.error("Get activities error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
      activity_type,
    } = req.body;

    // Check required fields
    if (!user_id || !activity_type) {
      return res.status(400).json({
        error: "user_id and activity_type are required",
      });
    }

    // Allowed activity types
    const allowedActivities = [
      "login",
      "register",
      "view",
      "scan",
      "interact",
    ];

    if (!allowedActivities.includes(activity_type)) {
      return res.status(400).json({
        error: "Invalid activity_type",
        allowed_types: allowedActivities,
      });
    }

    // Plant ID is required for plant-related activities
    if (
      ["view", "scan", "interact"].includes(activity_type) &&
      !plant_id
    ) {
      return res.status(400).json({
        error: `plant_id is required for ${activity_type} activity`,
      });
    }

    // Plant ID should not be required for login/register
    const finalPlantId =
      ["login", "register"].includes(activity_type)
        ? null
        : plant_id;

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
      [
        user_id,
        finalPlantId,
        activity_type,
      ]
    );

    res.status(201).json({
      message: "Activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createLoginActivity = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: "user_id is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, NULL, 'login')
      RETURNING *
      `,
      [user_id]
    );

    res.status(201).json({
      message: "Login activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create login activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createRegisterActivity = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: "user_id is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, NULL, 'register')
      RETURNING *
      `,
      [user_id]
    );

    res.status(201).json({
      message: "Register activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create register activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createViewActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
    } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, 'view')
      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    res.status(201).json({
      message: "View activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create view activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createScanActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
    } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, 'scan')
      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    res.status(201).json({
      message: "Scan activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create scan activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createInteractActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
    } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, 'interact')
      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    res.status(201).json({
      message: "Interact activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create interact activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createWaterActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
    } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, 'water')
      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    res.status(201).json({
      message: "Watering activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create water activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createCollectActivity = async (req, res) => {
  try {
    const {
      user_id,
      plant_id,
    } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO user_activity (
        user_id,
        plant_id,
        activity_type
      )
      VALUES ($1, $2, 'collect')
      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    res.status(201).json({
      message: "Collecting activity created successfully",
      activity: result.rows[0],
    });

  } catch (err) {
    console.error("Create collect activity error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createUniqueView = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, plant_id } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    await client.query("BEGIN");

    // Check whether this user has already viewed this plant
    const existing = await client.query(
      `
      SELECT id
      FROM user_plant_views
      WHERE user_id = $1
        AND plant_id = $2
      `,
      [user_id, plant_id]
    );

    // Already viewed before
    if (existing.rows.length > 0) {
      await client.query("COMMIT");

      return res.status(200).json({
        message: "Plant already viewed before",
        is_new: false,
      });
    }

    // New unique plant view
    await client.query(
      `
      INSERT INTO user_plant_views (
        user_id,
        plant_id
      )
      VALUES ($1, $2)
      `,
      [user_id, plant_id]
    );

    // Get Plant Viewing achievement
    const achievement = await client.query(
      `
      SELECT id
      FROM achievements
      WHERE achievement_key = 'plant_viewing'
      `
    );

    if (achievement.rows.length > 0) {
      const achievement_id = achievement.rows[0].id;

      // Increase achievement progress by 1
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value
        )
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = achievement_progress.current_value + 1,
          updated_at = NOW()
        `,
        [user_id, achievement_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "New unique plant view recorded",
      is_new: true,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create unique view error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};

exports.createUniqueView = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, plant_id } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    await client.query("BEGIN");

    // Check whether this user has already viewed this plant
    const existing = await client.query(
      `
      SELECT id
      FROM user_plant_views
      WHERE user_id = $1
        AND plant_id = $2
      `,
      [user_id, plant_id]
    );

    // Already viewed before
    if (existing.rows.length > 0) {
      await client.query("COMMIT");

      return res.status(200).json({
        message: "Plant already viewed before",
        is_new: false,
      });
    }

    // New unique plant view
    await client.query(
      `
      INSERT INTO user_plant_views (
        user_id,
        plant_id
      )
      VALUES ($1, $2)
      `,
      [user_id, plant_id]
    );

    // Get Plant Viewing achievement
    const achievement = await client.query(
      `
      SELECT id
      FROM achievements
      WHERE achievement_key = 'plant_viewing'
      `
    );

    if (achievement.rows.length > 0) {
      const achievement_id = achievement.rows[0].id;

      // Increase achievement progress by 1
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value
        )
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = achievement_progress.current_value + 1,
          updated_at = NOW()
        `,
        [user_id, achievement_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "New unique plant view recorded",
      is_new: true,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create unique view error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};

exports.createUniqueScan = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, plant_id } = req.body;

    if (!user_id || !plant_id) {
      return res.status(400).json({
        error: "user_id and plant_id are required",
      });
    }

    await client.query("BEGIN");

    // Check whether this user has already scanned this plant
    const existing = await client.query(
      `
      SELECT id
      FROM user_plant_scans
      WHERE user_id = $1
        AND plant_id = $2
      `,
      [user_id, plant_id]
    );

    // Already scanned before
    if (existing.rows.length > 0) {
      await client.query("COMMIT");

      return res.status(200).json({
        message: "Plant already scanned before",
        is_new: false,
      });
    }

    // New unique plant scan
    await client.query(
      `
      INSERT INTO user_plant_scans (
        user_id,
        plant_id
      )
      VALUES ($1, $2)
      `,
      [user_id, plant_id]
    );

    // Get Plant Scanning achievement
    const achievement = await client.query(
      `
      SELECT id
      FROM achievements
      WHERE achievement_key = 'plant_scanning'
      `
    );

    if (achievement.rows.length > 0) {
      const achievement_id = achievement.rows[0].id;

      // Increase achievement progress by 1
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value
        )
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = achievement_progress.current_value + 1,
          updated_at = NOW()
        `,
        [user_id, achievement_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "New unique plant scan recorded",
      is_new: true,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create unique scan error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};
