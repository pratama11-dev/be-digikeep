import { Router } from 'express';
import { createUser, LoginUser, logoutUser, refreshToken } from '../Controllers/Login';

const router = Router();

// user
router.post('/v1/login', LoginUser);
router.get('/v1/logout', logoutUser);
router.post('/v1/refresh-token', refreshToken);
router.post("/users/create-user", createUser)

export default router;