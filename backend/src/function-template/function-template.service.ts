import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FunctionTemplate, FunctionTemplateDocument } from './schemas/function-template.schema';

@Injectable()
export class FunctionTemplateService {
  constructor(
    @InjectModel(FunctionTemplate.name) private functionTemplateModel: Model<FunctionTemplateDocument>,
  ) {}
}
