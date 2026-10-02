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

exports.addNewAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "username, email, and password are required",
      });
    }

    // Check if email already exists in admins table
    const existingAdmin = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const result = await pool.query(
      `
      INSERT INTO admins (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
      `,
      [username, email, passwordHash]
    );

    res.status(201).json({
      message: "Admin created successfully",
      admin: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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