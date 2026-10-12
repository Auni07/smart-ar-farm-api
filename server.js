const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/userAuthRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const plantRoutes = require("./routes/plantRoutes");
const contentRoutes = require("./routes/contentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const userActivityRoutes = require("./routes/userActivityRoutes");
const quizRoutes = require("./routes/quizRoutes");
const plantCareRoutes = require("./routes/plantCareRoutes");
const agroGuideChatRoutes = require("./routes/agroGuideChatRoutes");
const mapRoutes = require("./routes/mapRoutes");
const supportRoutes = require("./routes/supportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/reset-password", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});

app.use("/auth", authRoutes);
app.use("/admin", adminAuthRoutes);
app.use("/admin/dashboard", adminDashboardRoutes);
app.use("/plants", plantRoutes);
app.use("/content", contentRoutes);
app.use("/profile", profileRoutes);
app.use("/achievements", achievementRoutes);
app.use("/activity", userActivityRoutes);
app.use("/quiz", quizRoutes);
app.use("/plant/care", plantCareRoutes);
app.use("/agroguide", agroGuideChatRoutes);
app.use("/map", mapRoutes);
app.use("/support", supportRoutes);
app.use("/notifications", notificationRoutes);

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});