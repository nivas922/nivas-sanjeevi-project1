import { Router } from "express";
import { BookController } from "../controllers/bookController.js";
import { uploadBookMiddleware } from "../middleware/upload.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/upload-book", uploadRateLimiter, uploadBookMiddleware, BookController.uploadBook);
router.get("/books", BookController.getUserBooks);
router.get("/books/:id/file", BookController.getBookFile);
router.get("/books/:id/chunks", BookController.getBookChunks);
router.get("/books/:id", BookController.getBookById);
router.delete("/books/:id", BookController.deleteBook);

export default router;

