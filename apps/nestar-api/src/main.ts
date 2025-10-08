import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS must be before any middleware
  app.enableCors({ origin: true, credentials: true });

  // GraphQL Upload middleware - must be before bodyParser
  app.use('/graphql', graphqlUploadExpress({
		maxFileSize: 15000000, // 15MB
		maxFiles: 10
	}));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));
  app.useGlobalInterceptors(new LoggingInterceptor())

	// Serve static files from uploads directory
	const uploadsPath = join(__dirname, '..', '..', '..', 'uploads');
	console.log('Serving uploads from:', uploadsPath);
	app.use('/uploads', express.static(uploadsPath));

  app.useWebSocketAdapter(new WsAdapter(app));

  const port = process.env.PORT_API ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📁 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
