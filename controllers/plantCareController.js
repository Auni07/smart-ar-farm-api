const pool = require("../config/db");

exports.getUserWateringRecords = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        error: "user_id is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        uwr.id,
        uwr.user_id,
        uwr.plant_id,
        uwr.watered_at,

        p.common_name AS plant_name,
        p.botanical_name,
        p.family_name

      FROM user_watering_records uwr

      LEFT JOIN plants p
        ON uwr.plant_id = p.id

      WHERE uwr.user_id = $1

      ORDER BY uwr.watered_at DESC
      `,
      [user_id]
    );

    res.json({
      total: result.rowCount,
      watering_records: result.rows,
    });

  } catch (err) {
    console.error("Get user watering records error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getUserCollectionRecords = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        error: "user_id is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        uc.id,
        uc.user_id,
        uc.collection_id,
        pc.plant_id,
        pc.collection_type,
        uc.collected_count,
        uc.first_collected_at,
        uc.last_collected_at,

        p.common_name AS plant_name,
        p.botanical_name,
        p.family_name

      FROM user_collections uc

      LEFT JOIN plant_collections pc
        ON uc.collection_id = pc.id

      LEFT JOIN plants p
        ON pc.plant_id = p.id

      WHERE uc.user_id = $1

      ORDER BY uc.last_collected_at DESC
      `,
      [user_id]
    );

    res.json({
      total: result.rowCount,
      collection_records: result.rows,
    });

  } catch (err) {
    console.error("Get user collection records error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// exports.addCollection = async (req, res) => {
//   try {
//     const {
//       user_id,
//       collection_id,
//     } = req.body;

//     if (!user_id || !collection_id) {
//       return res.status(400).json({
//         error: "user_id and collection_id are required",
//       });
//     }

//     // Check that the collection exists
//     const collectionCheck = await pool.query(
//       `
//       SELECT
//         pc.id,
//         pc.plant_id,
//         pc.collection_type,
//         p.common_name AS plant_name,
//         p.botanical_name

//       FROM plant_collections pc

//       LEFT JOIN plants p
//         ON pc.plant_id = p.id

//       WHERE pc.id = $1
//       `,
//       [collection_id]
//     );

//     if (collectionCheck.rowCount === 0) {
//       return res.status(404).json({
//         error: "Collection not found",
//       });
//     }

//     const collection = collectionCheck.rows[0];

//     // Add collection or increase existing count
//     const result = await pool.query(
//       `
//       INSERT INTO user_collections (
//         user_id,
//         collection_id,
//         collected_count,
//         first_collected_at,
//         last_collected_at
//       )

//       VALUES (
//         $1,
//         $2,
//         1,
//         NOW(),
//         NOW()
//       )

//       ON CONFLICT (user_id, collection_id)

//       DO UPDATE SET
//         collected_count =
//           user_collections.collected_count + 1,
//         last_collected_at = NOW()

//       RETURNING *
//       `,
//       [
//         user_id,
//         collection_id,
//       ]
//     );

//     res.status(201).json({
//       message: "Collection added successfully",

//       collection: {
//         ...result.rows[0],

//         plant_id: collection.plant_id,
//         collection_type: collection.collection_type,
//         plant_name: collection.plant_name,
//         botanical_name: collection.botanical_name,
//       },
//     });

//   } catch (err) {
//     console.error("Add collection error:", err);

//     res.status(500).json({
//       error: err.message,
//     });
//   }
// };

// exports.addWateringRecord = async (req, res) => {
//   try {
//     const {
//       user_id,
//       plant_id,
//     } = req.body;

//     if (!user_id || !plant_id) {
//       return res.status(400).json({
//         error: "user_id and plant_id are required",
//       });
//     }

//     // Check that the plant exists
//     const plantCheck = await pool.query(
//       `
//       SELECT
//         id,
//         common_name,
//         botanical_name,
//         family_name

//       FROM plants

//       WHERE id = $1
//       `,
//       [plant_id]
//     );

//     if (plantCheck.rowCount === 0) {
//       return res.status(404).json({
//         error: "Plant not found",
//       });
//     }

//     const plant = plantCheck.rows[0];

//     // Add one watering record
//     const result = await pool.query(
//       `
//       INSERT INTO user_watering_records (
//         user_id,
//         plant_id,
//         watered_at
//       )

//       VALUES (
//         $1,
//         $2,
//         NOW()
//       )

//       RETURNING *
//       `,
//       [
//         user_id,
//         plant_id,
//       ]
//     );

//     res.status(201).json({
//       message: "Watering record added successfully",

//       watering_record: {
//         ...result.rows[0],

//         plant_name: plant.common_name,
//         botanical_name: plant.botanical_name,
//         family_name: plant.family_name,
//       },
//     });

//   } catch (err) {
//     console.error("Add watering record error:", err);

//     res.status(500).json({
//       error: err.message,
//     });
//   }
// };

exports.addCollection = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      user_id,
      collection_id,
    } = req.body;

    if (!user_id || !collection_id) {
      return res.status(400).json({
        error: "user_id and collection_id are required",
      });
    }

    await client.query("BEGIN");

    // Check that the collection exists
    const collectionCheck = await client.query(
      `
      SELECT
        pc.id,
        pc.plant_id,
        pc.collection_type,
        p.common_name AS plant_name,
        p.botanical_name

      FROM plant_collections pc

      LEFT JOIN plants p
        ON pc.plant_id = p.id

      WHERE pc.id = $1
      `,
      [collection_id]
    );

    if (collectionCheck.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Collection not found",
      });
    }

    const collection = collectionCheck.rows[0];

    // Add collection or increase existing count
    const result = await client.query(
      `
      INSERT INTO user_collections (
        user_id,
        collection_id,
        collected_count,
        first_collected_at,
        last_collected_at
      )

      VALUES (
        $1,
        $2,
        1,
        NOW(),
        NOW()
      )

      ON CONFLICT (user_id, collection_id)

      DO UPDATE SET
        collected_count =
          user_collections.collected_count + 1,
        last_collected_at = NOW()

      RETURNING *
      `,
      [
        user_id,
        collection_id,
      ]
    );

    // Find Plant Collection achievement
    const achievement = await client.query(
      `
      SELECT id
      FROM achievements
      WHERE achievement_key = 'plant_collection'
      `
    );

    if (achievement.rowCount > 0) {
      const achievementId = achievement.rows[0].id;

      // Increase achievement progress by 1
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value,
          updated_at
        )
        VALUES ($1, $2, 1, NOW())

        ON CONFLICT (user_id, achievement_id)

        DO UPDATE SET
          current_value =
            achievement_progress.current_value + 1,
          updated_at = NOW()
        `,
        [
          user_id,
          achievementId,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Collection added successfully",

      collection: {
        ...result.rows[0],

        plant_id: collection.plant_id,
        collection_type: collection.collection_type,
        plant_name: collection.plant_name,
        botanical_name: collection.botanical_name,
      },
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Add collection error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};

exports.addWateringRecord = async (req, res) => {
  const client = await pool.connect();

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

    await client.query("BEGIN");

    // Check that the plant exists
    const plantCheck = await client.query(
      `
      SELECT
        id,
        common_name,
        botanical_name,
        family_name

      FROM plants

      WHERE id = $1
      `,
      [plant_id]
    );

    if (plantCheck.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Plant not found",
      });
    }

    const plant = plantCheck.rows[0];

    // Add one watering record
    const result = await client.query(
      `
      INSERT INTO user_watering_records (
        user_id,
        plant_id,
        watered_at
      )

      VALUES (
        $1,
        $2,
        NOW()
      )

      RETURNING *
      `,
      [
        user_id,
        plant_id,
      ]
    );

    // Find Watering achievement
    const achievement = await client.query(
      `
      SELECT id
      FROM achievements
      WHERE achievement_key = 'watering'
      `
    );

    if (achievement.rowCount > 0) {
      const achievementId = achievement.rows[0].id;

      // Increase achievement progress by 1
      await client.query(
        `
        INSERT INTO achievement_progress (
          user_id,
          achievement_id,
          current_value,
          updated_at
        )
        VALUES ($1, $2, 1, NOW())

        ON CONFLICT (user_id, achievement_id)

        DO UPDATE SET
          current_value =
            achievement_progress.current_value + 1,
          updated_at = NOW()
        `,
        [
          user_id,
          achievementId,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Watering record added successfully",

      watering_record: {
        ...result.rows[0],

        plant_name: plant.common_name,
        botanical_name: plant.botanical_name,
        family_name: plant.family_name,
      },
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Add watering record error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};