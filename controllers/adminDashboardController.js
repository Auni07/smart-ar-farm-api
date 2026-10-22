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
      WITH quiz_stats AS (
        SELECT
          COUNT(*)::int AS total_quizzes,
          COUNT(*) FILTER (
            WHERE is_active = TRUE
          )::int AS active_quizzes
        FROM quiz_sets
      ),
      attempt_stats AS (
        SELECT
          COUNT(*)::int AS total_attempts,
          COUNT(*) FILTER (
            WHERE completed_at IS NOT NULL
          )::int AS completed_attempts,
          COUNT(DISTINCT user_id)::int AS unique_users,
          COUNT(*) FILTER (
            WHERE completed_at IS NOT NULL
              AND score = total_questions
          )::int AS perfect_attempts,
          COUNT(*) FILTER (
            WHERE completed_at IS NOT NULL
              AND total_questions > 0
              AND score >= CEIL(total_questions * 0.6)
          )::int AS passed_attempts
        FROM quiz_attempts
      ),
      answer_stats AS (
        SELECT
          COUNT(*)::int AS total_answers,
          COUNT(*) FILTER (
            WHERE is_correct = TRUE
          )::int AS correct_answers,
          COUNT(*) FILTER (
            WHERE is_correct = FALSE
          )::int AS incorrect_answers
        FROM quiz_answers
      )
      SELECT
        q.total_quizzes,
        q.active_quizzes,
        a.total_attempts,
        a.completed_attempts,
        a.unique_users,
        a.perfect_attempts,
        a.passed_attempts,
        ans.total_answers,
        ans.correct_answers,
        ans.incorrect_answers
      FROM quiz_stats q
      CROSS JOIN attempt_stats a
      CROSS JOIN answer_stats ans
    `);

    const overviewRow = overviewResult.rows[0];

    const totalAnswers = Number(overviewRow.total_answers);
    const correctAnswers = Number(overviewRow.correct_answers);

    const overview = {
      total_quizzes: Number(overviewRow.total_quizzes),
      active_quizzes: Number(overviewRow.active_quizzes),

      total_attempts: Number(overviewRow.total_attempts),
      completed_attempts: Number(overviewRow.completed_attempts),

      total_answers: totalAnswers,
      correct_answers: correctAnswers,
      incorrect_answers: Number(overviewRow.incorrect_answers),

      overall_accuracy:
        totalAnswers > 0
          ? Number(
              ((correctAnswers / totalAnswers) * 100).toFixed(1)
            )
          : 0,

      unique_users: Number(overviewRow.unique_users),
      perfect_attempts: Number(overviewRow.perfect_attempts),
      passed_attempts: Number(overviewRow.passed_attempts),

      pass_rate:
        Number(overviewRow.completed_attempts) > 0
          ? Number(
              (
                (Number(overviewRow.passed_attempts) /
                  Number(overviewRow.completed_attempts)) *
                100
              ).toFixed(1)
            )
          : 0,
    };

    // Category Statistics
    const categoryResult = await pool.query(`
      WITH quiz_categories AS (
        SELECT
          qs.quiz_type,
          COUNT(*)::int AS quiz_count
        FROM quiz_sets qs
        WHERE qs.quiz_type IN ('general', 'plant_specific')
        GROUP BY qs.quiz_type
      ),
      attempt_categories AS (
        SELECT
          qs.quiz_type,

          COUNT(qa.id)::int AS attempts,

          COUNT(qa.id) FILTER (
            WHERE qa.completed_at IS NOT NULL
          )::int AS completed_attempts,

          COUNT(DISTINCT qa.user_id)::int AS unique_users,

          COALESCE(
            AVG(
              CASE
                WHEN qa.completed_at IS NOT NULL
                  AND qa.total_questions > 0
                THEN qa.score::numeric
                     / qa.total_questions * 100
              END
            ),
            0
          ) AS accuracy,

          COALESCE(
            AVG(
              CASE
                WHEN qa.completed_at IS NOT NULL
                THEN qa.score
              END
            ),
            0
          ) AS average_score,

          COUNT(qa.id) FILTER (
            WHERE qa.completed_at IS NOT NULL
              AND qa.score = qa.total_questions
          )::int AS perfect_attempts,

          COUNT(qa.id) FILTER (
            WHERE qa.completed_at IS NOT NULL
              AND qa.total_questions > 0
              AND qa.score >= CEIL(qa.total_questions * 0.6)
          )::int AS passed_attempts

        FROM quiz_sets qs

        LEFT JOIN quiz_attempts qa
          ON qa.quiz_set_id = qs.id

        WHERE qs.quiz_type IN ('general', 'plant_specific')

        GROUP BY qs.quiz_type
      ),
      answer_categories AS (
        SELECT
          qs.quiz_type,
          COUNT(qans.id)::int AS total_answers,
          COUNT(qans.id) FILTER (
            WHERE qans.is_correct = TRUE
          )::int AS correct_answers
        FROM quiz_sets qs

        LEFT JOIN quiz_attempts qa
          ON qa.quiz_set_id = qs.id

        LEFT JOIN quiz_answers qans
          ON qans.attempt_id = qa.id

        WHERE qs.quiz_type IN ('general', 'plant_specific')

        GROUP BY qs.quiz_type
      )
      SELECT
        qc.quiz_type,
        qc.quiz_count,
        COALESCE(ac.attempts, 0)::int AS attempts,
        COALESCE(ac.completed_attempts, 0)::int
          AS completed_attempts,
        COALESCE(ac.unique_users, 0)::int AS unique_users,
        COALESCE(ans.total_answers, 0)::int AS total_answers,
        COALESCE(ans.correct_answers, 0)::int AS correct_answers,
        COALESCE(ac.accuracy, 0) AS accuracy,
        COALESCE(ac.average_score, 0) AS average_score,
        COALESCE(ac.perfect_attempts, 0)::int AS perfect_attempts,
        COALESCE(ac.passed_attempts, 0)::int AS passed_attempts
      FROM quiz_categories qc

      LEFT JOIN attempt_categories ac
        ON ac.quiz_type = qc.quiz_type

      LEFT JOIN answer_categories ans
        ON ans.quiz_type = qc.quiz_type
    `);

    const categories = categoryResult.rows.map((row) => {
      const answers = Number(row.total_answers);
      const correct = Number(row.correct_answers);
      const completed = Number(row.completed_attempts);

      return {
        quiz_type: row.quiz_type,
        quiz_count: Number(row.quiz_count),

        attempts: Number(row.attempts),
        completed_attempts: completed,
        unique_users: Number(row.unique_users),

        accuracy: Number(Number(row.accuracy).toFixed(1)),

        average_score: Number(
          Number(row.average_score).toFixed(2)
        ),

        pass_rate:
          completed > 0
            ? Number(
                (
                  (Number(row.passed_attempts) / completed) *
                  100
                ).toFixed(1)
              )
            : 0,

        perfect_attempts: Number(row.perfect_attempts),

        total_answers: answers,
        correct_answers: correct,

        answer_accuracy:
          answers > 0
            ? Number(((correct / answers) * 100).toFixed(1))
            : 0,
      };
    });

    // AR Experience category
    const arCategoryResult = await pool.query(`
      SELECT
        COUNT(DISTINCT s.id)::int AS quiz_count,

        COUNT(a.id)::int AS attempts,

        COUNT(a.id) FILTER (
          WHERE a.completed_at IS NOT NULL
        )::int AS completed_attempts,

        COUNT(DISTINCT a.user_id)::int AS unique_users,

        COALESCE(
          AVG(
            CASE
              WHEN a.completed_at IS NOT NULL
                AND a.total_questions > 0
              THEN a.score::numeric
                   / a.total_questions * 100
            END
          ),
          0
        ) AS accuracy,

        COALESCE(
          AVG(
            CASE
              WHEN a.completed_at IS NOT NULL
              THEN a.score
            END
          ),
          0
        ) AS average_score,

        COUNT(a.id) FILTER (
          WHERE a.completed_at IS NOT NULL
            AND a.score = a.total_questions
        )::int AS perfect_attempts,

        COUNT(a.id) FILTER (
          WHERE a.completed_at IS NOT NULL
            AND a.total_questions > 0
            AND a.score >= CEIL(a.total_questions * 0.7)
        )::int AS passed_attempts,

        COALESCE(
          SUM(
            CASE
              WHEN a.completed_at IS NOT NULL
              THEN a.total_questions
              ELSE 0
            END
          ),
          0
        )::int AS total_answers_proxy,

        COALESCE(
          SUM(
            CASE
              WHEN a.completed_at IS NOT NULL
              THEN a.score
              ELSE 0
            END
          ),
          0
        )::int AS correct_answers_proxy

      FROM ar_quiz_sessions s

      LEFT JOIN ar_quiz_attempts a
        ON a.ar_quiz_session_id = s.id
    `);

    const arRow = arCategoryResult.rows[0];

    const arTotalAnswers = Number(arRow.total_answers_proxy);
    const arCorrectAnswers = Number(arRow.correct_answers_proxy);
    const arCompleted = Number(arRow.completed_attempts);

    categories.push({
      quiz_type: "ar_experience",

      // Number of generated AR quiz sessions.
      quiz_count: Number(arRow.quiz_count),

      attempts: Number(arRow.attempts),
      completed_attempts: arCompleted,
      unique_users: Number(arRow.unique_users),

      accuracy: Number(Number(arRow.accuracy).toFixed(1)),

      average_score: Number(
        Number(arRow.average_score).toFixed(2)
      ),

      pass_rate:
        arCompleted > 0
          ? Number(
              (
                (Number(arRow.passed_attempts) / arCompleted) *
                100
              ).toFixed(1)
            )
          : 0,

      perfect_attempts: Number(arRow.perfect_attempts),

      // These are estimates from completed attempt scores,
      // not actual records from an AR answer table.
      total_answers: arTotalAnswers,
      correct_answers: arCorrectAnswers,

      answer_accuracy:
        arTotalAnswers > 0
          ? Number(
              ((arCorrectAnswers / arTotalAnswers) * 100).toFixed(1)
            )
          : 0,
    });

    // Keep the category order consistent.
    const categoryOrder = {
      general: 1,
      plant_specific: 2,
      ar_experience: 3,
    };

    categories.sort(
      (a, b) =>
        categoryOrder[a.quiz_type] - categoryOrder[b.quiz_type]
    );


    // Individual Quiz
    const quizzesResult = await pool.query(`
      WITH attempt_stats AS (
        SELECT
          qa.quiz_set_id,

          COUNT(*)::int AS attempts,

          COUNT(*) FILTER (
            WHERE qa.completed_at IS NOT NULL
          )::int AS completed_attempts,

          COUNT(DISTINCT qa.user_id)::int AS unique_users,

          COALESCE(
            AVG(
              CASE
                WHEN qa.completed_at IS NOT NULL
                THEN qa.score
              END
            ),
            0
          ) AS average_score,

          COUNT(*) FILTER (
            WHERE qa.completed_at IS NOT NULL
              AND qa.score = qa.total_questions
          )::int AS perfect_attempts,

          COUNT(*) FILTER (
            WHERE qa.completed_at IS NOT NULL
              AND qa.total_questions > 0
              AND qa.score >= CEIL(qa.total_questions * 0.6)
          )::int AS passed_attempts

        FROM quiz_attempts qa
        GROUP BY qa.quiz_set_id
      ),
      answer_stats AS (
        SELECT
          qa.quiz_set_id,
          COUNT(qans.id)::int AS total_answers,
          COUNT(qans.id) FILTER (
            WHERE qans.is_correct = TRUE
          )::int AS correct_answers
        FROM quiz_attempts qa

        LEFT JOIN quiz_answers qans
          ON qans.attempt_id = qa.id

        GROUP BY qa.quiz_set_id
      )
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

        COALESCE(ast.attempts, 0)::int AS attempts,
        COALESCE(ast.completed_attempts, 0)::int
          AS completed_attempts,
        COALESCE(ast.unique_users, 0)::int AS unique_users,

        COALESCE(ans.total_answers, 0)::int AS total_answers,
        COALESCE(ans.correct_answers, 0)::int AS correct_answers,

        COALESCE(ast.average_score, 0) AS average_score,
        COALESCE(ast.perfect_attempts, 0)::int AS perfect_attempts,
        COALESCE(ast.passed_attempts, 0)::int AS passed_attempts

      FROM quiz_sets qs

      LEFT JOIN plants p
        ON qs.plant_id = p.id

      LEFT JOIN attempt_stats ast
        ON ast.quiz_set_id = qs.id

      LEFT JOIN answer_stats ans
        ON ans.quiz_set_id = qs.id

      WHERE qs.quiz_type IN ('general', 'plant_specific')

      ORDER BY
        COALESCE(ast.attempts, 0) DESC,
        qs.title ASC
    `);

    const quizzes = quizzesResult.rows.map((row) => {
      const answers = Number(row.total_answers);
      const correct = Number(row.correct_answers);
      const completed = Number(row.completed_attempts);

      return {
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
        completed_attempts: completed,
        unique_users: Number(row.unique_users),

        total_answers: answers,
        correct_answers: correct,

        accuracy:
          completed > 0
            ? Number(
                (
                  (Number(row.average_score) /
                    Number(row.question_count)) *
                  100
                ).toFixed(1)
              )
            : 0,

        answer_accuracy:
          answers > 0
            ? Number(((correct / answers) * 100).toFixed(1))
            : 0,

        average_score: Number(
          Number(row.average_score).toFixed(2)
        ),

        pass_rate:
          completed > 0
            ? Number(
                (
                  (Number(row.passed_attempts) / completed) *
                  100
                ).toFixed(1)
              )
            : 0,

        perfect_attempts: Number(row.perfect_attempts),
      };
    });


    // Achievement Statistics
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

    return res.json({
      overview,
      categories,
      quizzes,
      achievements,
      recent_activity: recentActivity,
    });

  } catch (err) {
    console.error("Quiz dashboard error:", err);

    return res.status(500).json({
      error: "Failed to retrieve quiz dashboard",
      details: err.message,
    });
  }
};
