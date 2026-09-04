import { Router } from "express";
import { BookController } from "../controllers/bookController.js";
import { authGuard } from "../middleware/auth.js";
import { uploadBookMiddleware } from "../middleware/upload.js";

const router = Router();

router.post("/upload-book", authGuard, uploadBookMiddleware, BookController.uploadBook);
router.get("/books", authGuard, BookController.getUserBooks);
router.get("/books/:id", authGuard, BookController.getBookById);

export default router;
