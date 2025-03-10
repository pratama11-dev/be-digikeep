import { Router } from 'express';
import passport from 'passport';
import { checkAuth } from '../Middleware/checkAuth';
import { getListUser, getSessions } from '../Controllers/Users';
import { CreateDocument, DetailDocument, ListDocument } from '../Controllers/Document';

const router = Router();

// Add passport middleware for JWT authentication
router.use(passport.authenticate('jwt', { session: false }));


// document
router.post("/", ListDocument)
router.post("/detail", DetailDocument)
router.post("/add", CreateDocument)


export default router;