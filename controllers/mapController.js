
const pool = require("../config/db");

exports.visitMapLocation = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, map_id } = req.body;

    // Validate user ID
    if (
      !Number.isInteger(Number(user_id)) ||
      Number(user_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid User ID is required",
      });
    }

    // Validate map ID
    if (
      !Number.isInteger(Number(map_id)) ||
      Number(map_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid Map ID is required",
      });
    }

    await client.query("BEGIN");

    // check user existence
    const userResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "User not found",
      });
    }

    // check farm location existence
    const mapResult = await client.query(
      `
      SELECT
        map_id,
        name,
        coordinates,
        activity_available,
        image_url
      FROM farm_map
      WHERE map_id = $1
      `,
      [map_id]
    );

    if (mapResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Farm location not found",
      });
    }

    const location = mapResult.rows[0];

    // insert a new visit record if the user hasn't visited this location before
    // If already visited, no duplicate record
    const visitResult = await client.query(
      `
      INSERT INTO user_map_visit (
        user_id,
        map_id,
        first_visited_at
      )
      VALUES ($1, $2, NOW())

      ON CONFLICT (user_id, map_id)
      DO NOTHING

      RETURNING *
      `,
      [user_id, map_id]
    );

    const isNewVisit = visitResult.rowCount > 0;

    // update achievement progress for farm locations if it's a new visit
    if (isNewVisit) {
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value,
          updated_at
        )
        SELECT
          $1,
          a.id,
          COUNT(umv.map_id),
          NOW()
        FROM achievements a

        LEFT JOIN user_map_visit umv
          ON umv.user_id = $1

        WHERE a.achievement_key = 'farm_locations'

        GROUP BY a.id

        ON CONFLICT (user_id, achievement_id)

        DO UPDATE SET
          current_value = EXCLUDED.current_value,
          updated_at = NOW()
        `,
        [user_id]
      );
    }

    // get current achievement progress for farm locations
    const achievementResult = await client.query(
      `
      SELECT
        a.id AS achievement_id,
        a.achievement_key,
        a.name,
        COALESCE(ap.current_value, 0) AS current_value

      FROM achievements a

      LEFT JOIN achievement_progress ap
        ON ap.achievement_id = a.id
        AND ap.user_id = $1

      WHERE a.achievement_key = 'farm_locations'
      `,
      [user_id]
    );

    const achievement = achievementResult.rows[0] || null;

    await client.query("COMMIT");

    // response
    res.status(isNewVisit ? 201 : 200).json({
      message: isNewVisit
        ? "New farm location visited successfully"
        : "You have already visited this location",

      is_new_visit: isNewVisit,

      location: {
        map_id: location.map_id,
        name: location.name,
        coordinates: location.coordinates,
        activity_available: location.activity_available,
        image_url: location.image_url,
      },

      visit: isNewVisit
        ? visitResult.rows[0]
        : null,

      achievement: achievement
        ? {
            achievement_id: achievement.achievement_id,
            achievement_key: achievement.achievement_key,
            name: achievement.name,
            current_value: Number(achievement.current_value),
          }
        : null,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Visit map location error:", err);

    res.status(500).json({
      error: "Unable to record farm location visit",
    });

  } finally {
    client.release();
  }
};
