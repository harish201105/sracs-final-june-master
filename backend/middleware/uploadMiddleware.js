// Simple middleware to ensure file upload is handled by express-fileupload
const uploadMiddleware = (req, res, next) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  next();
};

module.exports = uploadMiddleware;
