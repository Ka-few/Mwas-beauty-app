import express from 'express';
import { login, getUsers, createUser, changePassword } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/password', changePassword);

export default router;