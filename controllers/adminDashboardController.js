const pool = require("../config/db");

const formatUserId = (id) => {
  return `USR-${String(id).padStart(4, "0")}`;
};

// GET /admin/dashboard
// Returns everything in one API call
exports.getCompleteDashboard = async (req, res) => {
  try {
    const summaryQuery = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS total_users,

        (
          SELECT COALESCE(SUM(scan_count), 0)
          FROM user_plant_scans
        )::int AS total_scans,

        (
          SELECT COUNT(*)
          FROM user_activity
          WHERE activity_type = 'interact'
        )::int AS total_interact,

        (
          SELECT COALESCE(SUM(view_count), 0)
          FROM user_plant_views
        )::int AS total_views,

        (
          SELECT COUNT(*)
          FROM user_watering_records
        )::int AS total_water,

        (
          SELECT COALESCE(SUM(collected_count), 0)
          FROM user_collections
        )::int AS total_collect,

        (
          SELECT COUNT(*)
          FROM users
          WHERE created_at >= NOW() - INTERVAL '7 days'
        )::int AS new_users_last_7_days,

        (
          SELECT COUNT(*)
          FROM users
          WHERE created_at >= NOW() - INTERVAL '30 days'
        )::int AS new_users_last_30_days
    `);

    const summary = summaryQuery.rows[0];

    const todayQuery = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN activity_type IN (
            'scan',
            'interact',
            'view',
            'login',
            'water',
            'collect'
          )
          THEN user_id
        END)::int AS active_users,

        COUNT(*) FILTER (
          WHERE activity_type = 'scan'
        )::int AS scan,

        COUNT(*) FILTER (
          WHERE activity_type = 'interact'
        )::int AS interact,

        COUNT(*) FILTER (
          WHERE activity_type = 'view'
        )::int AS view,

        COUNT(*) FILTER (
          WHERE activity_type = 'water'
        )::int AS water,

        COUNT(*) FILTER (
          WHERE activity_type = 'collect'
        )::int AS collect

      FROM user_activity
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    const dailyQuery = await pool.query(`
      SELECT
        day::date AS date,
        COUNT(ua.id)::int AS total_activities

      FROM generate_series(
        CURRENT_DATE - INTERVAL '27 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day

      LEFT JOIN user_activity ua
        ON ua.created_at >= day
        AND ua.created_at < day + INTERVAL '1 day'

      GROUP BY day
      ORDER BY day ASC
    `);

    const weeklyQuery = await pool.query(`
      SELECT
        week_start::date AS week_start,
        (week_start + INTERVAL '6 days')::date AS week_end,
        COUNT(ua.id)::int AS total_activities

      FROM generate_series(
        date_trunc('week', CURRENT_DATE) - INTERVAL '4 weeks',
        date_trunc('week', CURRENT_DATE),
        INTERVAL '1 week'
      ) AS week_start

      LEFT JOIN user_activity ua
        ON ua.created_at >= week_start
        AND ua.created_at < week_start + INTERVAL '1 week'

      GROUP BY week_start
      ORDER BY week_start ASC
    `);

    const monthlyQuery = await pool.query(`
      SELECT
        month_start::date AS month_start,
        TO_CHAR(month_start, 'YYYY-MM') AS month,
        COUNT(ua.id)::int AS total_activities

      FROM generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '4 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS month_start

      LEFT JOIN user_activity ua
        ON ua.created_at >= month_start
        AND ua.created_at < month_start + INTERVAL '1 month'

      GROUP BY month_start
      ORDER BY month_start ASC
    `);

    // top scanned plants
    const scannedQuery = await pool.query(`
      SELECT
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,

        CASE
          WHEN p.image_urls IS NOT NULL
               AND array_length(p.image_urls, 1) > 0
          THEN p.image_urls[1]
          ELSE NULL
        END AS image_url,

        COALESCE(SUM(ups.scan_count), 0)::int AS total_scan

      FROM plants p

      LEFT JOIN user_plant_scans ups
        ON ups.plant_id = p.id

      GROUP BY
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        p.image_urls

      ORDER BY total_scan DESC, p.common_name ASC

      LIMIT 10
    `);

    // top viewed plants
    const viewedQuery = await pool.query(`
      SELECT
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,

        CASE
          WHEN p.image_urls IS NOT NULL
               AND array_length(p.image_urls, 1) > 0
          THEN p.image_urls[1]
          ELSE NULL
        END AS image_url,

        COALESCE(SUM(upv.view_count), 0)::int AS total_view

      FROM plants p

      LEFT JOIN user_plant_views upv
        ON upv.plant_id = p.id

      GROUP BY
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        p.image_urls

      ORDER BY total_view DESC, p.common_name ASC

      LIMIT 10
    `);

    // latest 20 activities
    const activitiesQuery = await pool.query(`
      SELECT
        ua.id,
        ua.user_id,
        ua.plant_id,
        ua.activity_type,
        ua.created_at,

        u.username,
        u.email,

        p.common_name,
        p.botanical_name,
        p.family_name

      FROM user_activity ua

      LEFT JOIN users u
        ON ua.user_id = u.id

      LEFT JOIN plants p
        ON ua.plant_id = p.id

      ORDER BY ua.created_at DESC

      LIMIT 20
    `);

    const latestActivities = activitiesQuery.rows.map((activity) => ({
      id: activity.id,
      user_id: formatUserId(activity.user_id),
      plant_id: activity.plant_id,
      activity_type: activity.activity_type,
      created_at: activity.created_at,
      username: activity.username,
      email: activity.email,
      common_name: activity.common_name,
      botanical_name: activity.botanical_name,
      family_name: activity.family_name,
    }));

    // response
    res.json({
      total: {
        users: summary.total_users,
        plant_scan: summary.total_scans,
        plant_interact: summary.total_interact,
        plant_view: summary.total_views,
        plant_water: summary.total_water,
        plant_collect: summary.total_collect,
        new_users_last_7_days: summary.new_users_last_7_days,
        new_users_last_30_days: summary.new_users_last_30_days,
      },

      today: todayQuery.rows[0],

      activity_frequency: {
        daily: dailyQuery.rows,
        weekly: weeklyQuery.rows,
        monthly: monthlyQuery.rows,
      },

      top_plants: {
        scanned: scannedQuery.rows,
        viewed: viewedQuery.rows,
      },

      latest_activities: latestActivities,
    });
  } catch (err) {
    console.error("Complete dashboard error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET /admin/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const totalUsersResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM users
    `);

    const totalScansResult = await pool.query(`
      SELECT COALESCE(SUM(scan_count), 0)::int AS total
      FROM user_plant_scans
    `);

    const totalInteractResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'interact'
    `);

    const totalViewsResult = await pool.query(`
      SELECT COALESCE(SUM(view_count), 0)::int AS total
      FROM user_plant_views
    `);

    const totalWaterResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_watering_records
    `);

    const totalCollectResult = await pool.query(`
      SELECT COALESCE(SUM(collected_count), 0)::int AS total
      FROM user_collections
    `);

    // New users - last 7 days
    const newUsers7Result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    // New users - last 30 days
    const newUsers30Result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Active users today
    // Any tracking activity except register
    const activeUsersTodayResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS total
      FROM user_activity
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
        AND activity_type IN (
          'scan',
          'interact',
          'view',
          'login',
          'water',
          'collect'
        )
    `);

    // Today's scans
    const scanTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'scan'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    // Today's interactions
    const interactTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'interact'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    // Today's views
    const viewTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'view'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    // Today's watering
    const waterTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'water'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    // Today's collection
    const collectTodayResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM user_activity
      WHERE activity_type = 'collect'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `);

    res.json({
      total: {
        users: totalUsersResult.rows[0].total,
        plant_scan: totalScansResult.rows[0].total,
        plant_interact: totalInteractResult.rows[0].total,
        plant_view: totalViewsResult.rows[0].total,
        plant_water: totalWaterResult.rows[0].total,
        plant_collect: totalCollectResult.rows[0].total,
        new_users_last_7_days: newUsers7Result.rows[0].total,
        new_users_last_30_days: newUsers30Result.rows[0].total,
      },

      today: {
        active_users: activeUsersTodayResult.rows[0].total,
        scan: scanTodayResult.rows[0].total,
        interact: interactTodayResult.rows[0].total,
        view: viewTodayResult.rows[0].total,
        water: waterTodayResult.rows[0].total,
        collect: collectTodayResult.rows[0].total,
      },
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET /admin/dashboard/activity-frequency
// Returns:
// 1. Last 28 days
// 2. Last 5 weeks
// 3. Last 5 months
exports.getActivityFrequency = async (req, res) => {
  try {
    // Last 28 days
    const dailyResult = await pool.query(`
      SELECT
        day::date AS date,
        COALESCE(COUNT(ua.id), 0)::int AS total_activities
      FROM generate_series(
        CURRENT_DATE - INTERVAL '27 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day
      LEFT JOIN user_activity ua
        ON ua.created_at >= day
        AND ua.created_at < day + INTERVAL '1 day'
      GROUP BY day
      ORDER BY day ASC
    `);

    // Last 5 weeks
    // Current week + previous 4 weeks
    // Monday -> Sunday
    const weeklyResult = await pool.query(`
      SELECT
        week_start::date AS week_start,
        (week_start + INTERVAL '6 days')::date AS week_end,
        COALESCE(COUNT(ua.id), 0)::int AS total_activities
      FROM generate_series(
        date_trunc('week', CURRENT_DATE) - INTERVAL '4 weeks',
        date_trunc('week', CURRENT_DATE),
        INTERVAL '1 week'
      ) AS week_start
      LEFT JOIN user_activity ua
        ON ua.created_at >= week_start
        AND ua.created_at < week_start + INTERVAL '1 week'
      GROUP BY week_start
      ORDER BY week_start ASC
    `);

    // Last 5 months
    // Current month + previous 4 months
    const monthlyResult = await pool.query(`
      SELECT
        month_start::date AS month_start,
        TO_CHAR(month_start, 'YYYY-MM') AS month,
        COALESCE(COUNT(ua.id), 0)::int AS total_activities
      FROM generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '4 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS month_start
      LEFT JOIN user_activity ua
        ON ua.created_at >= month_start
        AND ua.created_at < month_start + INTERVAL '1 month'
      GROUP BY month_start
      ORDER BY month_start ASC
    `);

    res.json({
      daily: dailyResult.rows,
      weekly: weeklyResult.rows,
      monthly: monthlyResult.rows,
    });
  } catch (err) {
    console.error("Activity frequency error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET /admin/dashboard/top-plants
// Returns:
// - Top 10 scanned plants
// - Top 10 viewed plants
exports.getTopPlants = async (req, res) => {
  try {
    const topScannedResult = await pool.query(`
      SELECT
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        CASE
          WHEN p.image_urls IS NOT NULL
               AND array_length(p.image_urls, 1) > 0
          THEN p.image_urls[1]
          ELSE NULL
        END AS image_url,
        COALESCE(SUM(ups.scan_count), 0)::int AS total_scan
      FROM plants p
      LEFT JOIN user_plant_scans ups
        ON ups.plant_id = p.id
      GROUP BY
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        p.image_urls
      ORDER BY total_scan DESC, p.common_name ASC
      LIMIT 10
    `);

    const topViewedResult = await pool.query(`
      SELECT
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        CASE
          WHEN p.image_urls IS NOT NULL
               AND array_length(p.image_urls, 1) > 0
          THEN p.image_urls[1]
          ELSE NULL
        END AS image_url,
        COALESCE(SUM(upv.view_count), 0)::int AS total_view
      FROM plants p
      LEFT JOIN user_plant_views upv
        ON upv.plant_id = p.id
      GROUP BY
        p.id,
        p.common_name,
        p.botanical_name,
        p.family_name,
        p.image_urls
      ORDER BY total_view DESC, p.common_name ASC
      LIMIT 10
    `);

    res.json({
      top_scanned: topScannedResult.rows,
      top_viewed: topViewedResult.rows,
    });
  } catch (err) {
    console.error("Top plants error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET /admin/dashboard/latest-activities
// Returns latest 20 records from user_activity
exports.getLatestActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ua.id,
        ua.user_id,
        ua.plant_id,
        ua.activity_type,
        ua.created_at,

        u.username,
        u.email,

        p.common_name,
        p.botanical_name,
        p.family_name

      FROM user_activity ua

      LEFT JOIN users u
        ON ua.user_id = u.id

      LEFT JOIN plants p
        ON ua.plant_id = p.id

      ORDER BY ua.created_at DESC
      LIMIT 20
    `);

    const activities = result.rows.map((activity) => ({
      id: activity.id,

      user_id: formatUserId(activity.user_id),

      plant_id: activity.plant_id,

      activity_type: activity.activity_type,

      created_at: activity.created_at,

      username: activity.username,

      email: activity.email,

      common_name: activity.common_name,

      botanical_name: activity.botanical_name,

      family_name: activity.family_name,
    }));

    res.json({
      activities,
    });
  } catch (err) {
    console.error("Latest activities error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET /admin/dashboard/all-activities
// Returns all records from user_activity
exports.getAllActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ua.id,
        ua.user_id,
        ua.plant_id,
        ua.activity_type,
        ua.created_at,

        u.username,
        u.email,

        p.common_name,
        p.botanical_name,
        p.family_name

      FROM user_activity ua

      LEFT JOIN users u
        ON ua.user_id = u.id

      LEFT JOIN plants p
        ON ua.plant_id = p.id

      ORDER BY ua.created_at DESC
    `);

    const activities = result.rows.map((activity) => ({
      id: activity.id,

      user_id: formatUserId(activity.user_id),

      plant_id: activity.plant_id,

      activity_type: activity.activity_type,

      created_at: activity.created_at,

      username: activity.username,

      email: activity.email,

      common_name: activity.common_name,

      botanical_name: activity.botanical_name,

      family_name: activity.family_name,
    }));

    res.json({
      total: activities.length,
      activities,
    });
  } catch (err) {
    console.error("All activities error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// GET QUIZ DASHBOARD
// GET /admin/dashboard/quiz
exports.getQuizDashboard = async (req, res) => {
  try {

    // Overview
    const overviewResult = await pool.query(`
      SELECT
        COUNT(DISTINCT qs.id)::int AS total_quizzes,

        COUNT(DISTINCT CASE
          WHEN qs.is_active = TRUE THEN qs.id
        END)::int AS active_quizzes,

        COUNT(qa.id)::int AS total_attempts,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL THEN 1
        END)::int AS completed_attempts,

        COUNT(qans.id)::int AS total_answers,

        COUNT(CASE
          WHEN qans.is_correct = TRUE THEN 1
        END)::int AS correct_answers,

        COUNT(CASE
          WHEN qans.is_correct = FALSE THEN 1
        END)::int AS incorrect_answers,

        COUNT(DISTINCT qa.user_id)::int AS unique_users,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.score = qa.total_questions
          THEN 1
        END)::int AS perfect_attempts,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.total_questions > 0
            AND qa.score >= CEIL(qa.total_questions * 0.6)
          THEN 1
        END)::int AS passed_attempts

      FROM quiz_sets qs

      LEFT JOIN quiz_attempts qa
        ON qa.quiz_set_id = qs.id

      LEFT JOIN quiz_answers qans
        ON qans.attempt_id = qa.id
    `);

    const overview = overviewResult.rows[0];

    const overallAccuracy =
      Number(overview.total_answers) > 0
        ? (
            (Number(overview.correct_answers) /
              Number(overview.total_answers)) *
            100
          ).toFixed(1)
        : "0.0";

    overview.overall_accuracy = Number(overallAccuracy);


    // Category statistics
    const categoryResult = await pool.query(`
      SELECT
        qs.quiz_type,

        COUNT(DISTINCT qs.id)::int AS quiz_count,

        COUNT(qa.id)::int AS attempts,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL THEN 1
        END)::int AS completed_attempts,

        COUNT(DISTINCT qa.user_id)::int AS unique_users,

        COUNT(qans.id)::int AS total_answers,

        COUNT(CASE
          WHEN qans.is_correct = TRUE THEN 1
        END)::int AS correct_answers,

        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN qa.completed_at IS NOT NULL
                THEN qa.score
              END
            ),
            0
          ),
          2
        ) AS average_score,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.score = qa.total_questions
          THEN 1
        END)::int AS perfect_attempts,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.total_questions > 0
            AND qa.score >= CEIL(qa.total_questions * 0.6)
          THEN 1
        END)::int AS passed_attempts

      FROM quiz_sets qs

      LEFT JOIN quiz_attempts qa
        ON qa.quiz_set_id = qs.id

      LEFT JOIN quiz_answers qans
        ON qans.attempt_id = qa.id

      GROUP BY qs.quiz_type

      ORDER BY
        CASE qs.quiz_type
          WHEN 'general' THEN 1
          WHEN 'plant_specific' THEN 2
          WHEN 'ar_experience' THEN 3
          ELSE 4
        END
    `);

    const categories = categoryResult.rows.map((row) => ({
      quiz_type: row.quiz_type,
      quiz_count: Number(row.quiz_count),
      attempts: Number(row.attempts),
      completed_attempts: Number(row.completed_attempts),
      unique_users: Number(row.unique_users),
      total_answers: Number(row.total_answers),
      correct_answers: Number(row.correct_answers),

      accuracy:
        Number(row.total_answers) > 0
          ? Number(
              (
                (Number(row.correct_answers) /
                  Number(row.total_answers)) *
                100
              ).toFixed(1)
            )
          : 0,

      average_score: Number(row.average_score),

      pass_rate:
        Number(row.completed_attempts) > 0
          ? Number(
              (
                (Number(row.passed_attempts) /
                  Number(row.completed_attempts)) *
                100
              ).toFixed(1)
            )
          : 0,

      perfect_attempts: Number(row.perfect_attempts),
    }));


    // Each quiz statistics
    const quizzesResult = await pool.query(`
      SELECT
        qs.id,
        qs.title,
        qs.quiz_type,
        qs.question_count,
        qs.description,
        qs.is_active,
        qs.created_at,

        qs.plant_id,

        p.common_name AS plant_common_name,
        p.botanical_name AS plant_botanical_name,

        COUNT(DISTINCT qa.id)::int AS attempts,

        COUNT(DISTINCT CASE
          WHEN qa.completed_at IS NOT NULL
          THEN qa.id
        END)::int AS completed_attempts,

        COUNT(DISTINCT qa.user_id)::int AS unique_users,

        COUNT(qans.id)::int AS total_answers,

        COUNT(CASE
          WHEN qans.is_correct = TRUE
          THEN 1
        END)::int AS correct_answers,

        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN qa.completed_at IS NOT NULL
                THEN qa.score
              END
            ),
            0
          ),
          2
        ) AS average_score,

        COUNT(DISTINCT CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.score = qa.total_questions
          THEN qa.id
        END)::int AS perfect_attempts,

        COUNT(DISTINCT CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.total_questions > 0
            AND qa.score >= CEIL(qa.total_questions * 0.6)
          THEN qa.id
        END)::int AS passed_attempts

      FROM quiz_sets qs

      LEFT JOIN plants p
        ON qs.plant_id = p.id

      LEFT JOIN quiz_attempts qa
        ON qa.quiz_set_id = qs.id

      LEFT JOIN quiz_answers qans
        ON qans.attempt_id = qa.id

      GROUP BY
        qs.id,
        qs.title,
        qs.quiz_type,
        qs.question_count,
        qs.description,
        qs.is_active,
        qs.created_at,
        qs.plant_id,
        p.common_name,
        p.botanical_name

      ORDER BY attempts DESC, qs.title ASC
    `);

    const quizzes = quizzesResult.rows.map((row) => ({
      id: row.id,

      title: row.title,

      quiz_type: row.quiz_type,

      question_count: Number(row.question_count),

      description: row.description,

      is_active: row.is_active,

      created_at: row.created_at,

      plant:
        row.quiz_type === "plant_specific" && row.plant_id
          ? {
              id: row.plant_id,
              common_name: row.plant_common_name,
              botanical_name: row.plant_botanical_name,
            }
          : null,

      attempts: Number(row.attempts),

      completed_attempts: Number(row.completed_attempts),

      unique_users: Number(row.unique_users),

      total_answers: Number(row.total_answers),

      correct_answers: Number(row.correct_answers),

      accuracy:
        Number(row.total_answers) > 0
          ? Number(
              (
                (Number(row.correct_answers) /
                  Number(row.total_answers)) *
                100
              ).toFixed(1)
            )
          : 0,

      average_score: Number(row.average_score),

      pass_rate:
        Number(row.completed_attempts) > 0
          ? Number(
              (
                (Number(row.passed_attempts) /
                  Number(row.completed_attempts)) *
                100
              ).toFixed(1)
            )
          : 0,

      perfect_attempts: Number(row.perfect_attempts),
    }));


    // Question Performance
    const questionResult = await pool.query(`
      SELECT
        q.id,
        q.question_text,

        q.plant_id,

        p.common_name AS plant_common_name,

        COUNT(qa.id)::int AS total_answers,

        COUNT(CASE
          WHEN qa.is_correct = TRUE
          THEN 1
        END)::int AS correct_answers,

        COUNT(CASE
          WHEN qa.is_correct = FALSE
          THEN 1
        END)::int AS incorrect_answers

      FROM questions q

      LEFT JOIN quiz_answers qa
        ON qa.question_id = q.id

      LEFT JOIN plants p
        ON q.plant_id = p.id

      GROUP BY
        q.id,
        q.question_text,
        q.plant_id,
        p.common_name

      ORDER BY total_answers DESC
    `);

    const questions = questionResult.rows.map((row) => ({
      id: row.id,

      question_text: row.question_text,

      plant:
        row.plant_id
          ? {
              id: row.plant_id,
              common_name: row.plant_common_name,
            }
          : null,

      total_answers: Number(row.total_answers),

      correct_answers: Number(row.correct_answers),

      incorrect_answers: Number(row.incorrect_answers),

      accuracy:
        Number(row.total_answers) > 0
          ? Number(
              (
                (Number(row.correct_answers) /
                  Number(row.total_answers)) *
                100
              ).toFixed(1)
            )
          : 0,
    }));


    // Achievement statistics for specific achievement IDs (10, 11, 12, 13)
    const achievementResult = await pool.query(`
      SELECT
        a.id,
        a.achievement_key,
        a.name,
        a.description,

        COUNT(DISTINCT ap.user_id)::int AS users_with_progress,

        COUNT(DISTINCT CASE
          WHEN ap.current_value >= al.target_value
          THEN ap.user_id
        END)::int AS users_unlocked,

        COALESCE(SUM(ap.current_value), 0)::int AS total_progress,

        COALESCE(AVG(ap.current_value), 0) AS average_progress,

        COUNT(DISTINCT al.id)::int AS level_count

      FROM achievements a

      LEFT JOIN achievement_progress ap
        ON ap.achievement_id = a.id

      LEFT JOIN achievement_levels al
        ON al.achievement_id = a.id

      WHERE a.id IN (10, 11, 12, 13)

      GROUP BY
        a.id,
        a.achievement_key,
        a.name,
        a.description

      ORDER BY a.id ASC
    `);

    const achievements = achievementResult.rows.map((row) => ({
      id: row.id,

      achievement_key: row.achievement_key,

      name: row.name,

      description: row.description,

      users_with_progress: Number(row.users_with_progress),

      users_unlocked: Number(row.users_unlocked),

      total_progress: Number(row.total_progress),

      average_progress: Number(
        Number(row.average_progress).toFixed(2)
      ),

      level_count: Number(row.level_count),
    }));


    // Recent Quiz Activity
    const recentResult = await pool.query(`
      SELECT
        qa.id,
        qa.user_id,
        qa.quiz_set_id,

        u.username,

        qs.title,
        qs.quiz_type,

        qa.score,
        qa.total_questions,

        qa.started_at,
        qa.completed_at,

        CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.score = qa.total_questions
          THEN TRUE
          ELSE FALSE
        END AS is_perfect,

        CASE
          WHEN qa.completed_at IS NOT NULL
            AND qa.total_questions > 0
            AND qa.score >= CEIL(qa.total_questions * 0.6)
          THEN TRUE
          ELSE FALSE
        END AS is_passed

      FROM quiz_attempts qa

      JOIN users u
        ON qa.user_id = u.id

      JOIN quiz_sets qs
        ON qa.quiz_set_id = qs.id

      ORDER BY
        COALESCE(qa.completed_at, qa.started_at) DESC

      LIMIT 20
    `);

    const recentActivity = recentResult.rows.map((row) => ({
      id: row.id,

      user_id: formatUserId(row.user_id),

      username: row.username,

      quiz_set_id: row.quiz_set_id,

      title: row.title,

      quiz_type: row.quiz_type,

      score: Number(row.score),

      total_questions: Number(row.total_questions),

      percentage:
        Number(row.total_questions) > 0
          ? Number(
              (
                (Number(row.score) /
                  Number(row.total_questions)) *
                100
              ).toFixed(1)
            )
          : 0,

      is_perfect: row.is_perfect,

      is_passed: row.is_passed,

      started_at: row.started_at,

      completed_at: row.completed_at,
    }));


    // Quiz trend - last 28 days
    const dailyTrendResult = await pool.query(`
      SELECT
        day::date AS date,

        COUNT(qa.id)::int AS attempts,

        COUNT(CASE
          WHEN qa.completed_at IS NOT NULL
          THEN 1
        END)::int AS completed_attempts,

        COUNT(DISTINCT qa.user_id)::int AS unique_users

      FROM generate_series(
        CURRENT_DATE - INTERVAL '27 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day

      LEFT JOIN quiz_attempts qa
        ON qa.started_at >= day
        AND qa.started_at < day + INTERVAL '1 day'

      GROUP BY day

      ORDER BY day ASC
    `);

    const dailyTrend = dailyTrendResult.rows.map((row) => ({
      date: row.date,
      attempts: Number(row.attempts),
      completed_attempts: Number(row.completed_attempts),
      unique_users: Number(row.unique_users),
    }));

    // response
    res.json({
      overview: {
        total_quizzes: Number(overview.total_quizzes),
        active_quizzes: Number(overview.active_quizzes),

        total_attempts: Number(overview.total_attempts),
        completed_attempts: Number(overview.completed_attempts),

        total_answers: Number(overview.total_answers),
        correct_answers: Number(overview.correct_answers),
        incorrect_answers: Number(overview.incorrect_answers),

        overall_accuracy: Number(overview.overall_accuracy),

        unique_users: Number(overview.unique_users),

        perfect_attempts: Number(overview.perfect_attempts),
        passed_attempts: Number(overview.passed_attempts),

        pass_rate:
          Number(overview.completed_attempts) > 0
            ? Number(
                (
                  (Number(overview.passed_attempts) /
                    Number(overview.completed_attempts)) *
                  100
                ).toFixed(1)
              )
            : 0,
      },

      categories,

      quizzes,

      questions: {
        total_questions: questions.length,

        most_answered: [...questions]
          .sort((a, b) => b.total_answers - a.total_answers)
          .slice(0, 10),

        hardest: [...questions]
          .filter((q) => q.total_answers > 0)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 10),

        easiest: [...questions]
          .filter((q) => q.total_answers > 0)
          .sort((a, b) => b.accuracy - a.accuracy)
          .slice(0, 10),
      },

      achievements,

      recent_activity: recentActivity,

      trend: {
        daily: dailyTrend,
      },
    });

  } catch (err) {
    console.error("Quiz dashboard error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};