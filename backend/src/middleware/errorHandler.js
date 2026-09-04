export const errorHandler = (err, req, res, next) => {
  console.error("❌ Application Error:", err.stack || err.message || err);

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size exceeds limit (Max 50MB for textbooks, 5MB for images)."
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || "An unexpected internal server error occurred."
  });
};
