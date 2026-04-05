import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplateController } from './function-template.controller';
import { FunctionTemplate, FunctionTemplateSchema } from './schemas/function-template.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FunctionTemplate.name, schema: FunctionTemplateSchema }])],
  providers: [FunctionTemplateService],
  controllers: [FunctionTemplateController]
})
export class FunctionTemplateModule {}
