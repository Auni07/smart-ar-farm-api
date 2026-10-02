const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/userAuthRoutes");
const adminRoutes = require("./routes/adminAuthRoutes");
const plantRoutes = require("./routes/plantRoutes");
const contentRoutes = require("./routes/contentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const userActivityRoutes = require("./routes/userActivityRoutes");
const plantCareRoutes = require("./routes/plantCareRoutes");
const agroGuideChatRoutes = require("./routes/agroGuideChatRoutes");
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
app.use("/admin", adminRoutes);
app.use("/plants", plantRoutes);
app.use("/content", contentRoutes);
app.use("/profile", profileRoutes);
app.use("/activity", userActivityRoutes);
app.use("/plant-care", plantCareRoutes);
app.use("/agroguide", agroGuideChatRoutes);
app.use("/support", supportRoutes);
app.use("/notifications", notificationRoutes);

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});