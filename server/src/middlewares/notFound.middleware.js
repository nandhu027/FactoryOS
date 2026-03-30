export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: [${req.method}] ${req.originalUrl}`,
  });
};
