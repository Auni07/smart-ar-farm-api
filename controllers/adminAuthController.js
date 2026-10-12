const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin account
    const result = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email]
    );

    // Admin email not found
    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "You don't have an admin record. Please contact smartarfarmexplorer@gmail.com for access.",
      });
    }

    const admin = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
      },
      process.env.JWT_SECRET || "smart_ar_secret_key",
      { expiresIn: "1h" }
    );

    res.cookie("access_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
    });

    res.json({
        message: "Login successful",
        admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
        },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        created_at
      FROM admins
      WHERE id = $1
      `,
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Admin not found",
      });
    }

    res.json({
      admin: result.rows[0],
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        error: "Username and email are required",
      });
    }

    // Check if another admin already uses the email
    const existingAdmin = await pool.query(
      `
      SELECT id
      FROM admins
      WHERE email = $1
      AND id != $2
      `,
      [email, adminId]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Update profile
    const result = await pool.query(
      `
      UPDATE admins
      SET username = $1,
          email = $2
      WHERE id = $3
      RETURNING id, username, email, created_at
      `,
      [username, email, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Admin not found",
      });
    }

    res.json({
      message: "Profile updated successfully",
      admin: result.rows[0],
    });
  } catch (err) {
    // Handle unique constraint errors
    if (err.code === "23505") {
      return res.status(400).json({
        error: "Username or email already exists",
      });
    }

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required",
      });
    }

    // Get current password hash
    const result = await pool.query(
      `
      SELECT password_hash
      FROM admins
      WHERE id = $1
      `,
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Admin not found",
      });
    }

    const admin = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      admin.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    // Prevent using the same password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      admin.password_hash
    );

    if (isSamePassword) {
      return res.status(400).json({
        error: "New password must be different from the current password",
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      saltRounds
    );

    // Update password
    await pool.query(
      `
      UPDATE admins
      SET password_hash = $1
      WHERE id = $2
      `,
      [newPasswordHash, adminId]
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

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: "Email and new password are required",
      });
    }

    // Find admin by email
    const result = await pool.query(
      `
      SELECT id
      FROM admins
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Admin account not found",
      });
    }

    const adminId = result.rows[0].id;

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(
      newPassword,
      saltRounds
    );

    // Update password
    await pool.query(
      `
      UPDATE admins
      SET password_hash = $1
      WHERE id = $2
      `,
      [passwordHash, adminId]
    );

    res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.addNewAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ID of the currently logged-in admin
    const createdBy = req.admin.id;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "username, email, and password are required",
      });
    }

    // Check if email already exists
    const existingAdmin = await pool.query(
      "SELECT id FROM admins WHERE email = $1",
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(
      password,
      saltRounds
    );

    // Insert new admin
    const result = await pool.query(
      `
      INSERT INTO admins (
        username,
        email,
        password_hash,
        created_by
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, created_at, created_by
      `,
      [
        username,
        email,
        passwordHash,
        createdBy
      ]
    );

    res.status(201).json({
      message: "Admin created successfully",
      admin: result.rows[0],
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({
      message: "Logout successful",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.me = async (req, res) => {
  try {
    res.json({
      authenticated: true,
      admin: {
        id: req.admin.id,
        email: req.admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};