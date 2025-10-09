import { NestFactory } from '@nestjs/core';
import { NestarBatchModule } from './aurux-batch.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(NestarBatchModule);
  await app.listen(process.env.PORT_BATCH ?? 3000);
}
bootstrap();
