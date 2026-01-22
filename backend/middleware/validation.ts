import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    } catch (err: any) {
        if (err.issues) {
            return res.status(400).json({
                status: 'fail',
                message: 'Validation Error',
                errors: err.errors
            });
        }
        next(err);
    }
};
