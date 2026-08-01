import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },

  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "application/pdf",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error("Unsupported file type");
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
});