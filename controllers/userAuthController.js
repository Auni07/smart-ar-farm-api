const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

exports.register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { username, email, password, birth_year } = req.body;

    await client.query("BEGIN");

    // Check if email already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await client.query(
      `INSERT INTO users 
       (username, email, password_hash, birth_year)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email`,
      [username, email, hashedPassword, birth_year]
    );

    const newUser = result.rows[0];

    // Add Account Creation achievement progress
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
        id,
        1,
        NOW()
      FROM achievements
      WHERE achievement_key = 'account_creation'
      ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = EXCLUDED.current_value,
        updated_at = NOW()
      `,
      [newUser.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Registration error:", err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password_hash,
        birth_year,
        avatar,
        watering_chance_limit,
        TO_CHAR(watering_chance_reset_date::date, 'YYYY-MM-DD')
          AS watering_chance_reset_date,
        collect_chance_limit,
        TO_CHAR(collect_chance_reset_date::date, 'YYYY-MM-DD')
          AS collect_chance_reset_date,
        ar_quiz_chance_limit,
        TO_CHAR(ar_quiz_chance_reset_date::date, 'YYYY-MM-DD')
          AS ar_quiz_chance_reset_date
      FROM users
      WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid password",
      });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        birth_year: user.birth_year,
        avatar: user.avatar,

        watering_chance_limit: user.watering_chance_limit,
        watering_chance_reset_date:
          user.watering_chance_reset_date,

        collect_chance_limit: user.collect_chance_limit,
        collect_chance_reset_date:
          user.collect_chance_reset_date,

        ar_quiz_chance_limit: user.ar_quiz_chance_limit,
        ar_quiz_chance_reset_date:
          user.ar_quiz_chance_reset_date,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      error: "An error occurred during login",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const {
      user_id,
      current_password,
      new_password,
    } = req.body;

    if (!user_id || !current_password || !new_password) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters",
      });
    }

    // Get user
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(
      current_password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      new_password,
      10
    );

    // Update password
    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [hashedPassword, user_id]
    );

    res.json({
      message: "Password changed successfully",
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE email = $1",
      [email]
    );

    // Don't reveal whether email exists
    if (result.rows.length === 0) {
      return res.json({
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    const user = result.rows[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires after 30 minutes
    const expiry = new Date(
      Date.now() + 30 * 60 * 1000
    );

    // Save token
    await pool.query(
      `UPDATE users
       SET reset_token = $1,
           reset_token_expires = $2
       WHERE id = $3`,
      [
        resetToken,
        expiry,
        user.id,
      ]
    );

    // Your reset page URL
    const resetLink =
      `${process.env.RESET_PASSWORD_URL}?token=${resetToken}`;

    // Send email
    await transporter.sendMail({
      from: `"SmartAR Farm Explorer" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your SmartAR Farm Explorer Password",

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset Request</h2>

          <p>Hello ${user.username},</p>

          <p>
            We received a request to reset your
            SmartAR Farm Explorer password.
          </p>

          <p>
            Click the button below to create a new password:
          </p>

          <p>
            <a href="${resetLink}"
               style="
                 display: inline-block;
                 padding: 12px 20px;
                 background-color: #1B5E20;
                 color: white;
                 text-decoration: none;
                 border-radius: 6px;
               ">
              Reset Password
            </a>
          </p>

          <p>
            This link will expire in 30 minutes.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <p>
            Regards,<br>
            SmartAR Farm Explorer
          </p>
        </div>
      `,
    });

    res.json({
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });

  } catch (err) {
    console.error("Forgot password error:", err);

    res.status(500).json({
      error: "Unable to send password reset email",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const {
      token,
      new_password,
    } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        error: "Token and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    // Find user with valid token
    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE reset_token = $1
       AND reset_token_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid or expired reset link",
      });
    }

    const userId = result.rows[0].id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      new_password,
      10
    );

    // Update password and remove reset token
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token = NULL,
           reset_token_expires = NULL
       WHERE id = $2`,
      [
        hashedPassword,
        userId,
      ]
    );

    res.json({
      message: "Password reset successfully",
    });

  } catch (err) {
    console.error("Reset password error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};