import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { Training, TrainingSchema } from './schemas/training.schema';

@Module({
 imports: [MongooseModule.forFeature([{ name: Training.name, schema: TrainingSchema }])],
 providers: [TrainingService],
 controllers: [TrainingController]
})
export class TrainingModule {}
