const jwt = require("jsonwebtoken");

const authenticateAdmin = (req, res, next) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "smart_ar_secret_key"
        );

        req.admin = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
};

module.exports = authenticateAdmin;