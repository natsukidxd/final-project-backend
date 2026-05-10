import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(req: Request, next: NextFunction, schema: Joi.ObjectSchema) {
  const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  };
  const { error, value } = schema.validate(req.body, options);
  if (error) {
    const message = `Validation error: ${error.details.map(x => x.message).join(', ')}`;
    next(message);
  } else {
    req.body = value;
    next();
  }
}