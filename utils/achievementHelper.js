/**
 * Increases a user's progress for an achievement by a fixed amount
 * and checks whether a new level was unlocked by this increment.
 * (Used by controllers that add +1 per action.)
 */
const increaseAchievementProgress = async (
  client,
  user_id,
  achievement_key,
  increment = 1
) => {
  const achievement = await client.query(
    `
    SELECT id
    FROM achievements
    WHERE achievement_key = $1
    `,
    [achievement_key]
  );

  if (achievement.rows.length === 0) {
    return null;
  }

  const achievement_id = achievement.rows[0].id;

  const progress = await client.query(
    `
    INSERT INTO achievement_progress (
      user_id,
      achievement_id,
      current_value,
      updated_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      current_value = achievement_progress.current_value + $3,
      updated_at = NOW()
    RETURNING current_value
    `,
    [user_id, achievement_id, increment]
  );

  const newValue = progress.rows[0].current_value;
  const oldValue = newValue - increment;

  return findUnlockedLevel(client, achievement_id, oldValue, newValue);
};

/**
 * Sets a user's progress to an absolute value (e.g. a recalculated COUNT)
 * and checks whether a new level was unlocked.
 * (Used by controllers that recompute progress instead of adding +1.)
 *
 * @param {object} client         - pg client (inside a transaction)
 * @param {number} user_id
 * @param {number} achievement_id - achievements.id
 * @param {number} newValue       - the recalculated progress value
 * @returns {object|null} unlocked level info, or null if nothing unlocked
 */
const setAchievementProgress = async (
  client,
  user_id,
  achievement_id,
  newValue
) => {
  newValue = Number(newValue);

  // Read the previous value (0 if the user has no progress yet)
  const current = await client.query(
    `
    SELECT current_value
    FROM achievement_progress
    WHERE user_id = $1
      AND achievement_id = $2
    `,
    [user_id, achievement_id]
  );

  const oldValue =
    current.rows.length > 0 ? Number(current.rows[0].current_value) : 0;

  // Save the new value
  await client.query(
    `
    INSERT INTO achievement_progress (
      user_id,
      achievement_id,
      current_value,
      updated_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      current_value = EXCLUDED.current_value,
      updated_at = NOW()
    `,
    [user_id, achievement_id, newValue]
  );

  // Progress did not go up, so nothing can be unlocked
  if (newValue <= oldValue) {
    return null;
  }

  return findUnlockedLevel(client, achievement_id, oldValue, newValue);
};

/**
 * Finds the highest level whose target was crossed between oldValue and newValue.
 */
const findUnlockedLevel = async (
  client,
  achievement_id,
  oldValue,
  newValue
) => {
  const unlocked = await client.query(
    `
    SELECT level_number, level_name, description, badge_icon
    FROM achievement_levels
    WHERE achievement_id = $1
      AND target_value > $2
      AND target_value <= $3
    ORDER BY level_number DESC
    LIMIT 1
    `,
    [achievement_id, oldValue, newValue]
  );

  return unlocked.rows.length > 0 ? unlocked.rows[0] : null;
};

/**
 * Builds the achievement dialog fields for the API response.
 * Accepts a single level, an array of levels, or null.
 */
const buildAchievementDialog = (levels) => {
  const list = (Array.isArray(levels) ? levels : [levels]).filter(Boolean);

  if (list.length === 0) {
    return { achievement_dialog: false };
  }

  const unlocked_levels = list.map((level) => ({
    level_name: level.level_name,
    description: level.description,
    badge_icon: level.badge_icon,
  }));

  if (list.length === 1) {
    return {
      achievement_dialog: true,
      title: "Achievement Unlocked!",
      description: `Congratulations! You've reached "${list[0].level_name}". ${list[0].description}`,
      unlocked_levels,
    };
  }

  return {
    achievement_dialog: true,
    title: "Achievements Unlocked!",
    description: `Congratulations! You've reached ${list
      .map((level) => `"${level.level_name}"`)
      .join(" and ")}.`,
    unlocked_levels,
  };
};

module.exports = {
  increaseAchievementProgress,
  setAchievementProgress,
  buildAchievementDialog,
};