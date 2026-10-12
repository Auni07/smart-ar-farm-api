const pool = require("../config/db");

exports.getProfile = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        birth_year,
        avatar
       FROM users
       WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      message: "Profile retrieved successfully",
      profile: result.rows[0],
    });

  } catch (err) {
    console.error("Get profile error:", err);

    res.status(500).json({
      error: "Unable to retrieve profile",
    });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const {
      id,
      username,
      email,
      birth_year,
      avatar,
    } = req.body;

    // Check required fields
    if (!id || !username || !email || !birth_year || !avatar) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Validate avatar
    if (avatar < 1 || avatar > 8) {
      return res.status(400).json({
        error: "Avatar must be between 1 and 8",
      });
    }

    // Check if user exists
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Check whether username belongs to another user
    const usernameResult = await pool.query(
      `SELECT id
       FROM users
       WHERE username = $1
       AND id != $2`,
      [username, id]
    );

    if (usernameResult.rows.length > 0) {
      return res.status(400).json({
        error: "Username already exists",
      });
    }

    // Check whether email belongs to another user
    const emailResult = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1
       AND id != $2`,
      [email, id]
    );

    if (emailResult.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Update profile
    const result = await pool.query(
      `UPDATE users
       SET username = $1,
           email = $2,
           birth_year = $3,
           avatar = $4
       WHERE id = $5
       RETURNING id, username, email, birth_year, avatar`,
      [
        username,
        email,
        birth_year,
        avatar,
        id,
      ]
    );

    res.json({
      message: "Profile updated successfully",
      profile: result.rows[0],
    });

  } catch (err) {
    console.error("Edit profile error:", err);

    res.status(500).json({
      error: "Unable to update profile",
    });
  }
};