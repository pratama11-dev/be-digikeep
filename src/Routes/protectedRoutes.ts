import { Router } from 'express';
import passport from 'passport';
import { checkAuth } from '../Middleware/checkAuth';
import { getListUser, getSessions } from '../Controllers/Users';
import { CreateDocument, deleteDocument } from '../Controllers/Document';
import { listBp } from '../Controllers/BusinessPartner';

const router = Router();

// Add passport middleware for JWT authentication
router.use(passport.authenticate('jwt', { session: false }));

router.get('/get-session', checkAuth(), getSessions);

// users
router.post("/users/list", getListUser)

// document
router.post("/document/add", CreateDocument)
router.post("/document/delete", deleteDocument)

// bp
router.post("/bp", listBp)

export default router;