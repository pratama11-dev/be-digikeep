import { Router } from 'express';
import passport from 'passport';
import { checkAuth } from '../Middleware/checkAuth';
import { AddCategory, CreateDocument, deleteDocument, DetailDocument, DocumentByStatus, ListCategoryDocument, ListDocument, updateDoc } from '../Controllers/Document';
import { listBp } from '../Controllers/BusinessPartner';

const router = Router();

// Add passport middleware for JWT authentication
router.use(passport.authenticate('jwt', { session: false }));

// document
router.post("/", ListDocument)
router.post("/by-status", DocumentByStatus)
router.post("/detail", DetailDocument)
router.post("/add", CreateDocument)
router.post("/update", updateDoc)
router.post("/delete", deleteDocument)

// categories
router.post("/categories", ListCategoryDocument)
router.post("/categories/add", AddCategory)


export default router;