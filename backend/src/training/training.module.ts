import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { Training, TrainingSchema } from './schemas/training.schema';
import { UserTraining, UserTrainingSchema } from './schemas/user-training.schema';
import { TeamTransferRequest, TeamTransferRequestSchema } from './schemas/team-transfer-request.schema';
import { Demande, DemandeSchema } from './schemas/demande.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'training');

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Training.name,            schema: TrainingSchema },
      { name: UserTraining.name,        schema: UserTrainingSchema },
      { name: TeamTransferRequest.name, schema: TeamTransferRequestSchema },
      { name: Demande.name,             schema: DemandeSchema },
      { name: User.name,                schema: UserSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
      fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.mp4', '.webm', '.mov'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error(`Type de fichier non autorisé: ${ext}`), false);
      },
    }),
  ],
  providers: [TrainingService],
  controllers: [TrainingController],
  exports: [TrainingService],
})
export class TrainingModule {}

