/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { NestarBatchController } from './aurux-batch.controller';
import { NestarBatchService } from './aurux-batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import PropertySchema from 'apps/aurux-api/src/schemas/Property.model';
import MemberSchema from 'apps/aurux-api/src/schemas/Member.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
  ],
  controllers: [NestarBatchController],
  providers: [NestarBatchService],
})
export class NestarBatchModule {}
