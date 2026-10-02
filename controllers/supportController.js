const pool = require("../config/db");

exports.getAllFaqs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        question,
        answer,
        created_at
      FROM faq
      ORDER BY id ASC
    `);

    res.json({
      total: result.rowCount,
      faqs: result.rows,
    });

  } catch (err) {
    console.error("Get FAQs error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.createReport = async (req, res) => {
  try {
    const {
      user_id,
      report_type,
      description,
    } = req.body;

    // Check required fields
    if (!user_id || !report_type) {
      return res.status(400).json({
        error: "user_id and report_type are required",
      });
    }

    // Allowed report types
    const allowedReportTypes = [
      "Incorrect Plant Information",
      "Incorrect Plant Identification",
      "AR Problem",
      "App Bug",
      "Map/Navigation Problem",
      "Others",
    ];

    if (!allowedReportTypes.includes(report_type)) {
      return res.status(400).json({
        error: "Invalid report_type",
        allowed_types: allowedReportTypes,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO report (
        user_id,
        report_type,
        description
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        user_id,
        report_type,
        description || null,
      ]
    );

    res.status(201).json({
      message: "Report submitted successfully",
      report: result.rows[0],
    });

  } catch (err) {
    console.error("Create report error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getPrivacyPolicy = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        type,
        title,
        last_updated,
        content,
        created_at
      FROM support_document
      WHERE type = 'policy'
    `);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Privacy Policy not found",
      });
    }

    res.json({
      document: result.rows[0],
    });

  } catch (err) {
    console.error("Get Privacy Policy error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getTermsOfService = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        type,
        title,
        last_updated,
        content,
        created_at
      FROM support_document
      WHERE type = 'terms'
    `);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Terms of Service not found",
      });
    }

    res.json({
      document: result.rows[0],
    });

  } catch (err) {
    console.error("Get Terms of Service error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};