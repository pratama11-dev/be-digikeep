import { Router } from 'express';
import passport from 'passport';
import { listBp } from '../Controllers/BusinessPartner';

const router = Router();

// Add passport middleware for JWT authentication
router.use(passport.authenticate('jwt', { session: false }));

// bp
router.post("/", listBp)


export default router;