import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificationService } from './certification.service';
import { CertificationController } from './certification.controller';
import { Certification, CertificationSchema } from './schemas/certification.schema';

@Module({
 imports: [MongooseModule.forFeature([{ name: Certification.name, schema: CertificationSchema }])],
 providers: [CertificationService],
 controllers: [CertificationController]
})
export class CertificationModule {}
