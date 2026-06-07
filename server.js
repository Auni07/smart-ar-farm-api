const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/userAuthRoutes");
const adminRoutes = require("./routes/adminAuthRoutes");
const plantRoutes = require("./routes/plantRoutes");
const contentRoutes = require("./routes/contentRoutes");
const userActivityRoutes = require("./routes/userActivityRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/plants", plantRoutes);
app.use("/content", contentRoutes);
app.use("/activity", userActivityRoutes);

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});