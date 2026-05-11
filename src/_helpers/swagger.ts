import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import YAML from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

export function setupSwagger(app: any) {
  const swaggerPath = path.join(__dirname, '../swagger.yaml');
  const swaggerDocument = YAML.load(fs.readFileSync(swaggerPath, 'utf8')) as any;

  // Dynamically filter servers based on NODE_ENV
  const env = process.env.NODE_ENV || 'development';
  if (swaggerDocument.servers) {
    if (env === 'production') {
      // Show only production server
      swaggerDocument.servers = swaggerDocument.servers.filter(
        (s: any) => s.url.includes('render.com')
      );
    } else {
      // Show only development server
      swaggerDocument.servers = swaggerDocument.servers.filter(
        (s: any) => s.url.includes('localhost')
      );
    }
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
