import { Router } from "express";
import { BookController } from "../controllers/bookController.js";
import { authGuard } from "../middleware/auth.js";
import { uploadBookMiddleware } from "../middleware/upload.js";

import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/upload-book", authGuard, uploadRateLimiter, uploadBookMiddleware, BookController.uploadBook);
router.get("/books", authGuard, BookController.getUserBooks);
router.get("/books/:id", authGuard, BookController.getBookById);
router.get("/books/:id/chunks", authGuard, BookController.getBookChunks);

export default router;

