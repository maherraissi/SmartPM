import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Training, TrainingDocument } from './schemas/training.schema';

@Injectable()
export class TrainingService {
 private logger = new Logger(TrainingService.name);

 constructor(
  @InjectModel(Training.name) private trainingModel: Model<TrainingDocument>,
  // In a real app we'd also have UserTraining logic to track progress
 ) {}

 async createFormation(payload: any) {
  this.logger.log(`Admin creating new Formation: ${payload.title}`);
  return this.trainingModel.create(payload);
 }

 async getAllFormations() {
  return this.trainingModel.find().lean().exec();
 }

 async assignUsersToFormation(formationId: string, userIds: string[]) {
  this.logger.log(`Assigning ${userIds.length} users to formation: ${formationId}`);
  // In real app, we'd update a UserTraining junction table or similar
  return { success: true, count: userIds.length };
 }

 async seedFormations() {
  const defaultFormations = [
   { 
    title: 'Low Level Requirements (LLR)', 
    targetPhase: 'LLR', 
    durationWeeks: 1, 
    quizDurationMinutes: 30,
    description: 'Comprehensive LLR authoring & review training.',
    materials: [
     { title: 'LLR Standards PDF', type: 'PDF', url: '/files/llr-std.pdf' },
     { title: 'Intro to LLR Video', type: 'VIDEO', url: 'https://vimeo.com/...' }
    ]
   },
   { 
    title: 'Low Level Testing (LLT)', 
    targetPhase: 'LLT', 
    durationWeeks: 2, 
    quizDurationMinutes: 45,
    description: 'MCDC and Unit testing techniques.',
    materials: [
     { title: 'LLT Testing Guide', type: 'PDF', url: '/files/llt-guide.pdf' }
    ]
   },
   { 
    title: 'High Level Testing (HLT)', 
    targetPhase: 'HLT', 
    durationWeeks: 2, 
    quizDurationMinutes: 45,
    description: 'Integration and System testing for HLR compliance.',
    materials: []
   }
  ];

  for (const f of defaultFormations) {
   const exists = await this.trainingModel.findOne({ title: f.title });
   if (!exists) await this.trainingModel.create(f);
  }
 }
}
