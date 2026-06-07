const pool = require("../config/db");

exports.getContent = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content");

    const rows = result.rows;

    const response = {
      featured_experience: { current_feature: null },
      news_posts: {},
      fun_facts: {},
    };

    let newsIndex = 1;
    let factIndex = 1;

    for (const row of rows) {
      if (row.type === "featured") {
        response.featured_experience.current_feature = {
          id: row.id,
          title: row.title,
          description: row.description,
          imageUrl: row.image_url,
        };
      }

      if (row.type === "news") {
        response.news_posts[`post${newsIndex}`] = {
          id: row.id,
          title: row.title,
          description: row.description,
          imageUrl: row.image_url,
        };
        newsIndex++;
      }

      if (row.type === "fun_fact") {
        response.fun_facts[`fact${factIndex}`] = {
          id: row.id,
          fact: row.fact,
          imageUrl: row.image_url,
        };
        factIndex++;
      }
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addContent = async (req, res) => {
  try {
    const { type, title, description, fact, image_url } = req.body;

    // basic validation
    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }

    const result = await pool.query(
      `INSERT INTO content (type, title, description, fact, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, description, fact, image_url]
    );

    res.status(201).json({
      message: "Content added successfully",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, fact, image_url } = req.body;

    // check if exists
    const existing = await pool.query(
      "SELECT * FROM content WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    const result = await pool.query(
      `UPDATE content
       SET type = $1,
           title = $2,
           description = $3,
           fact = $4,
           image_url = $5
       WHERE id = $6
       RETURNING *`,
      [type, title, description, fact, image_url, id]
    );

    res.json({
      message: "Content updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT * FROM content WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    await pool.query("DELETE FROM content WHERE id = $1", [id]);

    res.json({
      message: "Content deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};