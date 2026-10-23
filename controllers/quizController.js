
const pool = require("../config/db");

exports.getQuizSets = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id || !Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
      return res.status(400).json({
        error: "Valid User ID is required",
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

    // Get all active quiz sets and the user's latest completed attempt
    const result = await pool.query(
      `
      SELECT
        qs.id AS quiz_set_id,
        qs.title,
        qs.quiz_type,
        qs.question_count,
        qs.plant_id,
        qs.description,

        -- Always display /5 on the main quiz screen
        CASE
          WHEN qs.quiz_type = 'plant_specific' THEN 10
          ELSE 5
        END AS display_question_count,

        -- Check whether user has completed this quiz before
        CASE
          WHEN latest_attempt.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS has_answered,

        -- Latest completed quiz score
        latest_attempt.score,

        latest_attempt.total_questions,
        latest_attempt.completed_at

      FROM quiz_sets qs

      LEFT JOIN LATERAL (
        SELECT
          qa.id,
          qa.score,
          qa.total_questions,
          qa.completed_at
        FROM quiz_attempts qa
        WHERE qa.quiz_set_id = qs.id
          AND qa.user_id = $1
          AND qa.completed_at IS NOT NULL
        ORDER BY qa.completed_at DESC, qa.id DESC
        LIMIT 1
      ) latest_attempt ON TRUE

      WHERE qs.is_active = TRUE

      ORDER BY
        CASE qs.quiz_type
          WHEN 'general' THEN 1
          WHEN 'plant_specific' THEN 2
          WHEN 'ar_experience' THEN 3
          ELSE 4
        END,
        qs.id ASC
      `,
      [user_id]
    );

    // Group quiz sets by category
    const categories = {
      general: [],
      plant_specific: [],
      ar_experience: [],
    };

    result.rows.forEach((quiz) => {
      categories[quiz.quiz_type].push({
        quiz_set_id: quiz.quiz_set_id,
        title: quiz.title,
        quiz_type: quiz.quiz_type,
        question_count: quiz.display_question_count,
        plant_id: quiz.plant_id,
        description: quiz.description,

        has_answered: quiz.has_answered,

        score: quiz.has_answered ? quiz.score : null,
        total_questions: quiz.has_answered
          ? quiz.total_questions
          : null,

        completed_at: quiz.completed_at,
      });
    });

    res.json({
      message: "Quiz sets retrieved successfully",
      categories,
    });

  } catch (err) {
    console.error("Get quiz sets error:", err);

    res.status(500).json({
      error: "Unable to retrieve quiz sets",
    });
  }
};

exports.getAllQuizSets = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id || !Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
      return res.status(400).json({
        error: "Valid User ID is required",
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

    // Get all active quiz sets and the user's latest completed attempt
    const result = await pool.query(
      `
      SELECT
        qs.id AS quiz_set_id,
        qs.title,
        qs.quiz_type,
        qs.question_count,
        qs.plant_id,
        qs.description,

        -- Always display /5 on the main quiz screen
        CASE
          WHEN qs.quiz_type = 'plant_specific' THEN 10
          ELSE 5
        END AS display_question_count,

        -- Check whether user has completed this quiz before
        CASE
          WHEN latest_attempt.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS has_answered,

        -- Latest completed quiz score
        latest_attempt.score,

        latest_attempt.total_questions,
        latest_attempt.completed_at

      FROM quiz_sets qs

      LEFT JOIN LATERAL (
        SELECT
          qa.id,
          qa.score,
          qa.total_questions,
          qa.completed_at
        FROM quiz_attempts qa
        WHERE qa.quiz_set_id = qs.id
          AND qa.user_id = $1
          AND qa.completed_at IS NOT NULL
        ORDER BY qa.completed_at DESC, qa.id DESC
        LIMIT 1
      ) latest_attempt ON TRUE

      WHERE qs.is_active = TRUE

      ORDER BY
        CASE qs.quiz_type
          WHEN 'general' THEN 1
          WHEN 'plant_specific' THEN 2
          WHEN 'ar_experience' THEN 3
          ELSE 4
        END,
        qs.id ASC
      `,
      [user_id]
    );

    // Group quiz sets by category
    const categories = {
      general: [],
      plant_specific: [],
      ar_experience: [],
    };

    result.rows.forEach((quiz) => {
      categories[quiz.quiz_type].push({
        quiz_set_id: quiz.quiz_set_id,
        title: quiz.title,
        quiz_type: quiz.quiz_type,
        question_count: quiz.display_question_count,
        plant_id: quiz.plant_id,
        description: quiz.description,

        has_answered: quiz.has_answered,

        score: quiz.has_answered ? quiz.score : null,
        total_questions: quiz.has_answered
          ? quiz.total_questions
          : null,

        completed_at: quiz.completed_at,
      });
    });

    
    // Get the user's AR quiz sessions and latest attempt
    const arResult = await pool.query(
      `
      SELECT
        s.id AS quiz_set_id,
        s.title,
        s.created_at,
        COUNT(DISTINCT sq.question_id)::INT AS question_count,
        latest_attempt.score,
        latest_attempt.total_questions,
        latest_attempt.completed_at,

        CASE
          WHEN latest_attempt.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS has_answered

      FROM ar_quiz_sessions s

      LEFT JOIN ar_quiz_session_questions sq
        ON sq.quiz_set_ar_id = s.id

      LEFT JOIN LATERAL (
        SELECT
          aa.id,
          aa.score,
          aa.total_questions,
          aa.completed_at
        FROM ar_quiz_attempts aa
        WHERE aa.user_id = s.user_id
          AND aa.ar_quiz_session_id = s.id
          AND aa.completed_at IS NOT NULL
        ORDER BY aa.completed_at DESC, aa.id DESC
        LIMIT 1
      ) latest_attempt ON TRUE

      WHERE s.user_id = $1

      GROUP BY
        s.id,
        s.title,
        s.created_at,
        latest_attempt.id,
        latest_attempt.score,
        latest_attempt.total_questions,
        latest_attempt.completed_at

      ORDER BY s.id DESC
      `,
      [user_id]
    );

    // Add AR sessions to the existing ar_experience category
    for (const quiz of arResult.rows) {
      categories.ar_experience.push({
        quiz_set_id: quiz.quiz_set_id,
        title: quiz.title,
        quiz_type: "ar_experience",
        question_count: Number(quiz.question_count),
        plant_id: null,
        description: "Explore plants in AR and test your knowledge.",

        has_answered: quiz.has_answered,
        score: quiz.has_answered ? quiz.score : null,
        total_questions: quiz.has_answered
          ? quiz.total_questions
          : null,
        completed_at: quiz.completed_at,
      });
    }

    res.json({
      message: "Quiz sets retrieved successfully",
      categories,
    });

  } catch (err) {
    console.error("Get quiz sets error:", err);

    res.status(500).json({
      error: "Unable to retrieve quiz sets",
    });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const { quiz_set_id } = req.params;

    if (
      !Number.isInteger(Number(quiz_set_id)) ||
      Number(quiz_set_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid Quiz Set ID is required",
      });
    }

    // Check whether quiz set exists and is active
    const quizSetResult = await pool.query(
      `
      SELECT
        id,
        title,
        quiz_type,
        question_count,
        plant_id,
        description
      FROM quiz_sets
      WHERE id = $1
        AND is_active = TRUE
      `,
      [quiz_set_id]
    );

    if (quizSetResult.rows.length === 0) {
      return res.status(404).json({
        error: "Quiz set not found or inactive",
      });
    }

    const quizSet = quizSetResult.rows[0];

    // Determine how many questions to return
    // General quiz: maximum 5 questions
    // Other quiz types: follow the configured question count
    const numberOfQuestions =
      quizSet.quiz_type === "general"
        ? 5
        : quizSet.question_count;

    // Get questions and options
    // Randomly select questions on the server
    const result = await pool.query(
      `
      WITH selected_questions AS (
        SELECT
          q.id AS question_id,
          q.question_text,
          q.question_type,
          q.plant_id,
          q.explanation,
          qsq.question_order

        FROM quiz_set_questions qsq

        JOIN questions q
          ON q.id = qsq.question_id

        WHERE qsq.quiz_set_id = $1

        ORDER BY RANDOM()

        LIMIT $2
      )

      SELECT
        sq.question_id,
        sq.question_text,
        sq.question_type,
        sq.plant_id,
        sq.explanation,
        sq.question_order,

        COALESCE(
          json_agg(
            json_build_object(
              'option_id', qo.id,
              'option_text', qo.option_text,
              'is_correct', qo.is_correct
            )
            ORDER BY qo.id
          ) FILTER (WHERE qo.id IS NOT NULL),
          '[]'::json
        ) AS options

      FROM selected_questions sq

      LEFT JOIN question_options qo
        ON qo.question_id = sq.question_id

      GROUP BY
        sq.question_id,
        sq.question_text,
        sq.question_type,
        sq.plant_id,
        sq.explanation,
        sq.question_order

      ORDER BY sq.question_order ASC NULLS LAST, sq.question_id ASC
      `,
      [quiz_set_id, numberOfQuestions]
    );

    // Return selected questions
    res.json({
      message: "Quiz questions retrieved successfully",

      quiz_set: {
        quiz_set_id: quizSet.id,
        title: quizSet.title,
        quiz_type: quizSet.quiz_type,
        plant_id: quizSet.plant_id,
        description: quizSet.description,
        question_count: result.rows.length,
      },

      questions: result.rows,
    });

  } catch (err) {
    console.error("Get quiz questions error:", err);

    res.status(500).json({
      error: "Unable to retrieve quiz questions",
    });
  }
};

exports.getARQuizQuestions = async (req, res) => {
  try {
    const { ar_quiz_session_id } = req.params;
    const { user_id } = req.query;

    if (
      !Number.isInteger(Number(ar_quiz_session_id)) ||
      Number(ar_quiz_session_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid AR Quiz Session ID is required",
      });
    }

    if (
      !Number.isInteger(Number(user_id)) ||
      Number(user_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid User ID is required",
      });
    }

    // Verify that this AR quiz session belongs to the user
    const sessionResult = await pool.query(
      `
      SELECT id, user_id, title, created_at
      FROM ar_quiz_sessions
      WHERE id = $1
        AND user_id = $2
      `,
      [ar_quiz_session_id, user_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        error: "AR Quiz session not found",
      });
    }
    const session = sessionResult.rows[0];

    // Get all questions and their options for this session
    const result = await pool.query(
      `
      SELECT
        q.id AS question_id,
        q.question_text,
        q.question_type,
        q.plant_id,
        q.explanation,
        sq.question_order,

        COALESCE(
          json_agg(
            json_build_object(
              'option_id', qo.id,
              'option_text', qo.option_text,
              'is_correct', qo.is_correct
            )
            ORDER BY qo.id
          ) FILTER (WHERE qo.id IS NOT NULL),
          '[]'::json
        ) AS options

      FROM ar_quiz_session_questions sq

      JOIN ar_quiz_questions q
        ON q.id = sq.question_id

      LEFT JOIN ar_quiz_question_options qo
        ON qo.question_id = q.id

      WHERE sq.quiz_set_ar_id = $1

      GROUP BY
        q.id,
        q.question_text,
        q.question_type,
        q.plant_id,
        q.explanation,
        sq.question_order

      ORDER BY sq.question_order ASC
      `,
      [ar_quiz_session_id]
    );

    return res.json({
      message: "AR Quiz questions retrieved successfully",

      quiz_set: {
        quiz_set_id: Number(ar_quiz_session_id),
        title: session.title,
        quiz_type: "ar_experience",
        plant_id: null,
        description: "Explore plants in AR and test your knowledge.",
        question_count: result.rows.length,
      },

      questions: result.rows,
    });

  } catch (err) {
    console.error("Get AR quiz questions error:", err);

    return res.status(500).json({
      error: "Unable to retrieve AR quiz questions",
    });
  }
};

exports.createARQuizSession = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { user_id, plant_ids } = req.body;

    // 1. Validate user ID
    if (
      !Number.isInteger(Number(user_id)) ||
      Number(user_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid User ID is required",
      });
    }

    // 2. Validate plant IDs
    if (
      !Array.isArray(plant_ids) ||
      plant_ids.length === 0 ||
      !plant_ids.every(
        (id) =>
          Number.isInteger(Number(id)) &&
          Number(id) > 0
      )
    ) {
      return res.status(400).json({
        error: "plant_ids must be a non-empty array of valid IDs",
      });
    }

    // Convert IDs to numbers and remove duplicates
    const plantIds = [...new Set(plant_ids.map(Number))];

    await client.query("BEGIN");
    transactionStarted = true;

    // Deduct AR Quiz chance and reset if a new day
    const chanceResult = await client.query(
      `
      UPDATE users
      SET
        ar_quiz_chance_limit = CASE
          WHEN ar_quiz_chance_reset_date = CURRENT_DATE
            THEN ar_quiz_chance_limit - 1
          ELSE 2
        END,
        ar_quiz_chance_reset_date = CURRENT_DATE
      WHERE id = $1
        AND (
          ar_quiz_chance_reset_date IS DISTINCT FROM CURRENT_DATE
          OR ar_quiz_chance_limit > 0
        )
      RETURNING
        ar_quiz_chance_limit,
        ar_quiz_chance_reset_date
      `,
      [Number(user_id)]
    );

    if (chanceResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      // Distinguish a missing user from exhausted chances
      const userExists = await client.query(
        `SELECT id FROM users WHERE id = $1`,
        [Number(user_id)]
      );

      if (userExists.rowCount === 0) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      return res.status(400).json({
        error: "No AR Quiz chances remaining today",
      });
    }

    // 3. Check whether the user exists
    const userResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [Number(user_id)]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "User not found",
      });
    }

    // 4. Check that all plants exist
    const plantsResult = await client.query(
      `
      SELECT id
      FROM plants
      WHERE id = ANY($1::INT[])
      `,
      [plantIds]
    );

    const existingPlantIds = new Set(
      plantsResult.rows.map((plant) => Number(plant.id))
    );

    const invalidPlantIds = plantIds.filter(
      (id) => !existingPlantIds.has(id)
    );

    if (invalidPlantIds.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "Some plant IDs do not exist",
        invalid_plant_ids: invalidPlantIds,
      });
    }

    // 5. Determine how many questions to select
    let targetQuestionCount;

    if (plantIds.length === 1) {
      targetQuestionCount = 3;
    } else if (plantIds.length <= 4) {
      targetQuestionCount = 5;
    } else {
      targetQuestionCount = 10;
    }

    // 6. Check the available questions for these plants
    const availableQuestionsResult = await client.query(
      `
      SELECT
        q.plant_id,
        COUNT(*)::INT AS question_count
      FROM ar_quiz_questions q
      WHERE q.plant_id = ANY($1::INT[])
      GROUP BY q.plant_id
      `,
      [plantIds]
    );

    const questionCounts = new Map(
      availableQuestionsResult.rows.map((row) => [
        Number(row.plant_id),
        Number(row.question_count),
      ])
    );

    // A single plant must have all three questions.
    // For multiple plants, the combined pool must be sufficient.
    const totalAvailableQuestions = [
      ...questionCounts.values(),
    ].reduce((sum, count) => sum + count, 0);

    if (
      (plantIds.length === 1 &&
        (questionCounts.get(plantIds[0]) || 0) < 3) ||
      (plantIds.length > 1 &&
        totalAvailableQuestions < targetQuestionCount)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "Not enough questions available for the selected plants",
        required_questions: targetQuestionCount,
        available_questions: totalAvailableQuestions,
      });
    }

    // 7. Create the AR quiz session
    // Generate a title using the current date, e.g. AR Quest: 12 Oct 2026
    const dateTitle = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date());

    const sessionTitle = `AR Quest: ${dateTitle}`;

    const sessionResult = await client.query(
      `
      INSERT INTO ar_quiz_sessions (
        user_id,
        title
      )
      VALUES ($1, $2)
      RETURNING id, user_id, title, created_at
      `,
      [Number(user_id), sessionTitle]
    );

    const session = sessionResult.rows[0];
    const sessionId = session.id;

    // 8. Save all selected plants for this session
    for (const plantId of plantIds) {
      await client.query(
        `
        INSERT INTO ar_quiz_session_plants (
          quiz_set_ar_id,
          plant_id
        )
        VALUES ($1, $2)
        `,
        [sessionId, plantId]
      );
    }

    // 9. Randomly select the required questions
    // Questions are selected only from the selected plants.
    // Assign question_order from 1 onwards.
    const selectedQuestionsResult = await client.query(
      `
      WITH random_questions AS (
        SELECT
          q.id AS question_id
        FROM ar_quiz_questions q
        WHERE q.plant_id = ANY($1::INT[])
        ORDER BY RANDOM()
        LIMIT $2
      ),
      ordered_questions AS (
        SELECT
          question_id,
          ROW_NUMBER() OVER (
            ORDER BY RANDOM()
          )::INT AS question_order
        FROM random_questions
      )
      INSERT INTO ar_quiz_session_questions (
        quiz_set_ar_id,
        question_id,
        question_order
      )
      SELECT
        $3,
        question_id,
        question_order
      FROM ordered_questions
      ORDER BY question_order
      RETURNING question_id, question_order
      `,
      [plantIds, targetQuestionCount, sessionId]
    );

    // Safety check
    if (
      selectedQuestionsResult.rows.length !==
      targetQuestionCount
    ) {
      throw new Error(
        "The selected question count does not match the required count"
      );
    }

    // 10. Commit all changes
    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "AR quiz session created successfully",


      quiz_session: {
        ar_quiz_session_id: session.id,
        user_id: Number(user_id),
        title: session.title,
        created_at: session.created_at,
        quiz_type: "ar_experience",
        plant_ids: plantIds,
        question_count: selectedQuestionsResult.rows.length,
      },

      questions: selectedQuestionsResult.rows.map((question) => ({
        question_id: question.question_id,
        question_order: question.question_order,
      })),
    });

  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Create AR quiz session error:", err);

    return res.status(500).json({
      error: "Unable to create AR quiz session",
    });
  } finally {
    client.release();
  }
};

exports.submitQuizAttempt = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      user_id,
      quiz_set_id,
      score,
      total_questions,
    } = req.body;

    // 1. Validate input
    if (!Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
      return res.status(400).json({
        error: "Valid User ID is required",
      });
    }

    if (
      !Number.isInteger(Number(quiz_set_id)) ||
      Number(quiz_set_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid Quiz Set ID is required",
      });
    }

    if (!Number.isInteger(Number(score)) || Number(score) < 0) {
      return res.status(400).json({
        error: "Valid score is required",
      });
    }

    if (
      !Number.isInteger(Number(total_questions)) ||
      Number(total_questions) <= 0
    ) {
      return res.status(400).json({
        error: "Valid total questions is required",
      });
    }

    if (Number(score) > Number(total_questions)) {
      return res.status(400).json({
        error: "Score cannot be greater than total questions",
      });
    }

    const userId = Number(user_id);
    const quizSetId = Number(quiz_set_id);
    const submittedScore = Number(score);
    const submittedTotal = Number(total_questions);

    await client.query("BEGIN");
    transactionStarted = true;

    // 2. Check user exists
    const userResult = await client.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "User not found",
      });
    }

    // 3. Check quiz set exists and is active
    const quizSetResult = await client.query(
      `
      SELECT id, title, quiz_type, plant_id
      FROM quiz_sets
      WHERE id = $1
        AND is_active = TRUE
      `,
      [quizSetId]
    );

    if (quizSetResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Quiz set not found or inactive",
      });
    }

    const quizSet = quizSetResult.rows[0];
    const quizType = quizSet.quiz_type;

    // 4. Find the user's existing completed attempt
    const existingResult = await client.query(
      `
      SELECT id, score, total_questions
      FROM quiz_attempts
      WHERE user_id = $1
        AND quiz_set_id = $2
        AND completed_at IS NOT NULL
      ORDER BY completed_at DESC, id DESC
      LIMIT 1
      `,
      [userId, quizSetId]
    );

    let attemptId;
    let action;
    let savedScore = submittedScore;
    let savedTotal = submittedTotal;

    if (existingResult.rows.length === 0) {
      // First attempt: create a record
      const insertResult = await client.query(
        `
        INSERT INTO quiz_attempts (
          user_id,
          quiz_set_id,
          score,
          total_questions,
          started_at,
          completed_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
        `,
        [
          userId,
          quizSetId,
          submittedScore,
          submittedTotal,
        ]
      );

      attemptId = insertResult.rows[0].id;
      action = "created";
    } else {
      // Keep the existing record unless the new percentage is higher
      const existing = existingResult.rows[0];

      attemptId = existing.id;

      const oldScore = Number(existing.score);
      const oldTotal = Number(existing.total_questions);

      const newPercentage = submittedScore / submittedTotal;
      const oldPercentage =
        oldTotal > 0 ? oldScore / oldTotal : 0;

      if (newPercentage > oldPercentage) {
        await client.query(
          `
          UPDATE quiz_attempts
          SET score = $1,
              total_questions = $2,
              started_at = NOW(),
              completed_at = NOW()
          WHERE id = $3
          `,
          [
            submittedScore,
            submittedTotal,
            attemptId,
          ]
        );

        action = "updated";
      } else {
        action = "not_updated";
        savedScore = oldScore;
        savedTotal = oldTotal;
      }
    }

    // 5. Update General Quiz Achievement (ID 10)
    if (quizType === "general") {
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
          10,
          COUNT(*),
          NOW()
        FROM quiz_attempts qa
        JOIN quiz_sets qs ON qs.id = qa.quiz_set_id
        WHERE qa.user_id = $1
          AND qs.quiz_type = 'general'
          AND qa.completed_at IS NOT NULL
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = EXCLUDED.current_value,
          updated_at = NOW()
        `,
        [userId]
      );
    }

    // 6. Update Plant-Specific Quiz Achievement (ID 12)
    if (quizType === "plant_specific") {
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
          12,
          COUNT(DISTINCT qs.plant_id),
          NOW()
        FROM quiz_attempts qa
        JOIN quiz_sets qs ON qs.id = qa.quiz_set_id
        WHERE qa.user_id = $1
          AND qs.quiz_type = 'plant_specific'
          AND qs.plant_id IS NOT NULL
          AND qa.completed_at IS NOT NULL
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = EXCLUDED.current_value,
          updated_at = NOW()
        `,
        [userId]
      );
    }

    // 7. Update AR Experience Quiz Achievement (ID 13)
    if (quizType === "ar_experience") {
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
          13,
          COUNT(*),
          NOW()
        FROM quiz_attempts qa
        JOIN quiz_sets qs ON qs.id = qa.quiz_set_id
        WHERE qa.user_id = $1
          AND qs.quiz_type = 'ar_experience'
          AND qa.completed_at IS NOT NULL
          AND qa.total_questions > 0
          AND qa.score::FLOAT / qa.total_questions >= 0.6
        ON CONFLICT (user_id, achievement_id)
        DO UPDATE SET
          current_value = EXCLUDED.current_value,
          updated_at = NOW()
        `,
        [userId]
      );
    }

    // 8. Update Perfect Score Achievement (ID 11)
    // Counts perfect scores from regular quizzes AND AR quizzes.
    await updatePerfectScoreAchievement(client, userId);

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      message:
        action === "created"
          ? "Quiz attempt created successfully"
          : action === "updated"
            ? "Quiz attempt updated successfully"
            : "Existing higher or equal score retained",

      action,

      attempt: {
        attempt_id: attemptId,
        user_id: userId,
        quiz_set_id: quizSetId,
        quiz_type: quizType,
        score: savedScore,
        total_questions: savedTotal,
        is_perfect: savedScore === savedTotal,
      },
    });
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Quiz rollback error:", rollbackError);
      }
    }

    console.error("Submit quiz attempt error:", err);

    return res.status(500).json({
      error: "Unable to save quiz attempt",
    });
  } finally {
    client.release();
  }
};


exports.submitARQuizAttempt = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      user_id,
      ar_quiz_session_id,
      score,
      total_questions,
    } = req.body;

    // 1. Validate input
    if (!Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
      return res.status(400).json({
        error: "Valid User ID is required",
      });
    }

    if (
      !Number.isInteger(Number(ar_quiz_session_id)) ||
      Number(ar_quiz_session_id) <= 0
    ) {
      return res.status(400).json({
        error: "Valid AR Quiz Session ID is required",
      });
    }

    if (!Number.isInteger(Number(score)) || Number(score) < 0) {
      return res.status(400).json({
        error: "Valid score is required",
      });
    }

    if (
      !Number.isInteger(Number(total_questions)) ||
      Number(total_questions) <= 0
    ) {
      return res.status(400).json({
        error: "Valid total questions is required",
      });
    }

    if (Number(score) > Number(total_questions)) {
      return res.status(400).json({
        error: "Score cannot be greater than total questions",
      });
    }

    const userId = Number(user_id);
    const sessionId = Number(ar_quiz_session_id);
    const submittedScore = Number(score);
    const submittedTotal = Number(total_questions);

    await client.query("BEGIN");
    transactionStarted = true;

    // 2. Check user exists
    const userResult = await client.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "User not found",
      });
    }

    // 3. Check AR quiz session belongs to this user
    const sessionResult = await client.query(
      `
      SELECT id
      FROM ar_quiz_sessions
      WHERE id = $1
        AND user_id = $2
      `,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "AR Quiz session not found for this user",
      });
    }

    // 4. Validate the actual number of assigned questions
    const questionCountResult = await client.query(
      `
      SELECT COUNT(*)::INT AS question_count
      FROM ar_quiz_session_questions
      WHERE quiz_set_ar_id = $1
      `,
      [sessionId]
    );

    const actualQuestionCount =
      Number(questionCountResult.rows[0].question_count);

    if (
      actualQuestionCount === 0 ||
      submittedTotal !== actualQuestionCount
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "Total questions does not match the AR quiz session",
        expected_total_questions: actualQuestionCount,
      });
    }

    // 5. Create or update the AR quiz attempt.
    // Update only when the submitted score is higher.
    // Each session keeps one best-score record per user.
    const result = await client.query(
      `
      INSERT INTO ar_quiz_attempts (
        user_id,
        ar_quiz_session_id,
        score,
        total_questions,
        started_at,
        completed_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())

      ON CONFLICT (user_id, ar_quiz_session_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        total_questions = EXCLUDED.total_questions,
        started_at = NOW(),
        completed_at = NOW()

      WHERE EXCLUDED.score > ar_quiz_attempts.score

      RETURNING
        id,
        user_id,
        ar_quiz_session_id,
        score,
        total_questions,
        started_at,
        completed_at,
        (xmax = 0) AS inserted
      `,
      [
        userId,
        sessionId,
        submittedScore,
        submittedTotal,
      ]
    );

    let attempt;
    let action;

    if (result.rows.length > 0) {
      attempt = result.rows[0];

      action = attempt.inserted ? "created" : "updated";
    } else {
      // Existing score is equal to or higher than the submission.
      const existingResult = await client.query(
        `
        SELECT
          id,
          user_id,
          ar_quiz_session_id,
          score,
          total_questions,
          started_at,
          completed_at
        FROM ar_quiz_attempts
        WHERE user_id = $1
          AND ar_quiz_session_id = $2
        `,
        [userId, sessionId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error("Unable to retrieve saved AR quiz attempt");
      }

      attempt = existingResult.rows[0];
      action = "not_updated";
    }

    // 6. Update AR Experience Quiz Achievement (ID 13).
    // A session qualifies if its saved score reaches 60%.
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
        13,
        COUNT(*),
        NOW()
      FROM ar_quiz_attempts
      WHERE user_id = $1
        AND completed_at IS NOT NULL
        AND total_questions > 0
        AND score::FLOAT / total_questions >= 0.6
      ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = EXCLUDED.current_value,
        updated_at = NOW()
      `,
      [userId]
    );

    // 7. Update Perfect Score Achievement (ID 11).
    // Include regular quizzes and AR quizzes.
    await updatePerfectScoreAchievement(client, userId);

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      message:
        action === "created"
          ? "AR quiz attempt created successfully"
          : action === "updated"
            ? "AR quiz attempt updated successfully"
            : "Existing higher or equal score retained",

      action,

      attempt: {
        attempt_id: attempt.id,
        user_id: attempt.user_id,
        ar_quiz_session_id: attempt.ar_quiz_session_id,
        quiz_type: "ar_experience",
        score: Number(attempt.score),
        total_questions: Number(attempt.total_questions),
        is_perfect:
          Number(attempt.score) === Number(attempt.total_questions),
      },
    });
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("AR quiz rollback error:", rollbackError);
      }
    }

    console.error("Submit AR quiz attempt error:", err);

    return res.status(500).json({
      error: "Unable to save AR quiz attempt",
    });
  } finally {
    client.release();
  }
};

async function updatePerfectScoreAchievement(client, userId) {
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
      11,
      (
        SELECT COUNT(*)
        FROM quiz_attempts qa
        WHERE qa.user_id = $1
          AND qa.completed_at IS NOT NULL
          AND qa.total_questions > 0
          AND qa.score = qa.total_questions
      )
      +
      (
        SELECT COUNT(*)
        FROM ar_quiz_attempts ara
        WHERE ara.user_id = $1
          AND ara.completed_at IS NOT NULL
          AND ara.total_questions > 0
          AND ara.score = ara.total_questions
      ),
      NOW()
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      current_value = EXCLUDED.current_value,
      updated_at = NOW()
    `,
    [Number(userId)]
  );
}