const pool = require("../config/db");

exports.getAllPlants = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM plants");

    res.json({
      total: result.rowCount,
      plants: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlantBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // convert euphorbia_geroldii → euphorbia geroldii
    const botanicalName = slug
      .split("_")
      .join(" ")
      .toLowerCase();

    const result = await pool.query(
      `SELECT * FROM plants 
       WHERE LOWER(botanical_name) = $1`,
      [botanicalName]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Plant not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};