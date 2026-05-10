import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import YAML from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

export function setupSwagger(app: any) {
  const swaggerPath = path.join(__dirname, '../swagger.yaml');
  const swaggerDocument = YAML.load(fs.readFileSync(swaggerPath, 'utf8')) as any;
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}