import { Request, Response } from 'express';
import { initializeDB } from '../db/database';

export async function login(req: Request, res: Response) {
    const { username, password } = req.body;
    const db = await initializeDB();

    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', username);

        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // In a real app, use bcrypt.compare(password, user.password_hash)
        if (user.password_hash !== password) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        res.json({
            id: user.id,
            username: user.username,
            role: user.role
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
        await db.close();
    }
}

export async function getUsers(req: Request, res: Response) {
    const db = await initializeDB();
    try {
        const users = await db.all('SELECT id, username, role, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    } finally {
        await db.close();
    }
}

export async function createUser(req: Request, res: Response) {
    const { username, password, role } = req.body;
    const db = await initializeDB();
    try {
        const existing = await db.get('SELECT id FROM users WHERE username = ?', username);
        if (existing) {
            res.status(400).json({ message: 'Username already exists' });
            return;
        }

        await db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            username, password, role || 'staff'
        );
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    } finally {
        await db.close();
    }
}

export async function changePassword(req: Request, res: Response) {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
        res.status(400).json({ message: 'Password is required' });
        return;
    }

    const db = await initializeDB();
    try {
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', password, id);
        res.json({ message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password' });
    } finally {
        await db.close();
    }
}