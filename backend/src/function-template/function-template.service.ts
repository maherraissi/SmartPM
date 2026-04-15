import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FunctionTemplate, FunctionTemplateDocument } from './schemas/function-template.schema';

@Injectable()
export class FunctionTemplateService {
 constructor(
  @InjectModel(FunctionTemplate.name) private functionTemplateModel: Model<FunctionTemplateDocument>,
 ) {}

 // =========================================================================
 // ENTERPRISE PATTERN: UPSERT (Update or Insert)
 // Ensures the templates library stays robust without duplicates.
 // =========================================================================
 async seedTemplates(templates: any[]) {
  // We use bulkWrite to execute all upserts in a single database round-trip
  const bulkOps = templates.map(template => ({
   updateOne: {
    filter: { title: template.title, targetPhase: template.targetPhase }, // Find by title & phase
    update: { $set: template }, // Apply the new values
    upsert: true // Creates it if it doesn't exist
   }
  }));
  
  return this.functionTemplateModel.bulkWrite(bulkOps);
 }
}
