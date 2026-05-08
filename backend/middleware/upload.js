const multer = require('multer');
const path = require('path');
const fs = require('fs');

// We use memoryStorage for better compatibility with serverless/ephemeral environments like Render
// This avoids filesystem permission issues and is faster for small image processing
const storage = multer.memoryStorage();

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

function fileFilter(req, file, cb) {
  const extOk = ALLOWED_EXT.test(path.extname(file.originalname));
  const mimeOk = ALLOWED_MIME.includes(file.mimetype);
  
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP) are allowed.'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
});

module.exports = upload;
