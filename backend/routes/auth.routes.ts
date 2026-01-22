import express from 'express';
import { login, getUsers, createUser, changePassword, deleteUser } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/password', changePassword);
router.delete('/users/:id', deleteUser);

export default router;