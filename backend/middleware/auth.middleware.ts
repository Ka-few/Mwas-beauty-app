import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    // For a real production app, we would verify a JWT or Session token here.
    // For this implementation, we will check for a custom header that the frontend sends.
    const userHeader = req.headers['x-user-context'];

    if (!userHeader) {
        return res.status(401).json({ message: 'Unauthorized: No user context found' });
    }

    try {
        const user = JSON.parse(userHeader as string);
        (req as any).user = user;
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Unauthorized: Invalid user context' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
