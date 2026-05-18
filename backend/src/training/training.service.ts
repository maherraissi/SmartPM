import {
  Injectable, Logger, ConflictException,
  NotFoundException, BadRequestException, ForbiddenException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Training, TrainingDocument } from './schemas/training.schema';
import { UserTraining, UserTrainingDocument, UserTrainingStatus } from './schemas/user-training.schema';
import { TeamTransferRequest, TeamTransferRequestDocument, TransferStatus } from './schemas/team-transfer-request.schema';

@Injectable()
export class TrainingService {
  private logger = new Logger(TrainingService.name);

  constructor(
    @InjectModel(Training.name)             private trainingModel: Model<TrainingDocument>,
    @InjectModel(UserTraining.name)         private userTrainingModel: Model<UserTrainingDocument>,
    @InjectModel(TeamTransferRequest.name)  private transferModel: Model<TeamTransferRequestDocument>,
  ) {}

  // ─── Admin: Formations CRUD ──────────────────────────────────────────────────

  async createFormation(payload: any) {
    this.logger.log(`Admin creating Formation: ${payload.title}`);
    return this.trainingModel.create(payload);
  }

  async getAllFormations() {
    return this.trainingModel.find().lean().exec();
  }

  async getFormationById(id: string) {
    const f = await this.trainingModel.findById(id).lean().exec();
    if (!f) throw new NotFoundException('Formation not found');
    return f;
  }

  async updateFormation(id: string, payload: any) {
    const updated = await this.trainingModel.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) throw new NotFoundException('Formation not found');
    return updated;
  }

  async deleteFormation(id: string) {
    await this.trainingModel.findByIdAndDelete(id);
    return { success: true };
  }

  // ─── Admin: Assign members to a formation ───────────────────────────────────

  async assignMembersToFormation(formationId: string, userIds: string[], adminId: string) {
    this.logger.log(`Admin ${adminId} assigning formation ${formationId} to ${userIds.length} users`);
    const results: UserTrainingDocument[] = [];
    for (const uid of userIds) {
      const existing = await this.userTrainingModel.findOne({
        userId: new Types.ObjectId(uid),
        trainingId: new Types.ObjectId(formationId),
      });
      if (!existing) {
        const record = await this.userTrainingModel.create({
          userId: new Types.ObjectId(uid),
          trainingId: new Types.ObjectId(formationId),
          assignedBy: new Types.ObjectId(adminId),
          status: UserTrainingStatus.ASSIGNED,
        });
        results.push(record);
      }
    }
    return { assigned: results.length, skipped: userIds.length - results.length };
  }

  // ─── Member: My formations ───────────────────────────────────────────────────

  async getMyFormations(userId: string) {
    return this.userTrainingModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('trainingId')
      .lean()
      .exec();
  }

  async startFormation(userId: string, trainingId: string) {
    const record = await this.userTrainingModel.findOne({
      userId: new Types.ObjectId(userId),
      trainingId: new Types.ObjectId(trainingId),
    });
    if (!record) throw new NotFoundException('Formation not assigned to you');
    if (record.status === UserTrainingStatus.COMPLETED) {
      throw new BadRequestException('Formation already completed');
    }
    record.status = UserTrainingStatus.IN_PROGRESS;
    await record.save();
    return record;
  }

  async updateProgress(userId: string, trainingId: string, progress: number) {
    const record = await this.userTrainingModel.findOne({
      userId: new Types.ObjectId(userId),
      trainingId: new Types.ObjectId(trainingId),
    });
    if (!record) throw new NotFoundException('Formation not assigned to you');
    record.progress = Math.min(100, Math.max(0, progress));
    if (record.status === UserTrainingStatus.ASSIGNED) {
      record.status = UserTrainingStatus.IN_PROGRESS;
    }
    await record.save();
    return record;
  }

  // ─── Member: Submit quiz ─────────────────────────────────────────────────────

  async submitQuiz(userId: string, trainingId: string, answers: number[]) {
    const [record, formation] = await Promise.all([
      this.userTrainingModel.findOne({
        userId: new Types.ObjectId(userId),
        trainingId: new Types.ObjectId(trainingId),
      }),
      this.trainingModel.findById(trainingId),
    ]);

    if (!record) throw new NotFoundException('Formation not assigned to you');
    if (!formation) throw new NotFoundException('Formation not found');
    if (formation.quiz.length === 0) throw new BadRequestException('No quiz defined for this formation');

    // Calculate score
    let correct = 0;
    formation.quiz.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / formation.quiz.length) * 100);
    const passed = score >= (formation.passingScore || 80);

    record.quizScore = score;
    record.progress = 100;
    record.status = passed ? UserTrainingStatus.COMPLETED : UserTrainingStatus.FAILED;
    record.completedAt = passed ? new Date() : null;
    await record.save();

    return { score, passed, correct, total: formation.quiz.length };
  }

  async getMyProgress(userId: string, trainingId: string) {
    return this.userTrainingModel.findOne({
      userId: new Types.ObjectId(userId),
      trainingId: new Types.ObjectId(trainingId),
    }).exec();
  }

  async removeMyFormation(userId: string, trainingId: string) {
    return this.userTrainingModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      trainingId: new Types.ObjectId(trainingId),
    }).exec();
  }

  // ─── Member: Team Transfer Requests ─────────────────────────────────────────

  async requestTransfer(userId: string, fromEquipe: string, toEquipe: string, reason: string) {
    if (fromEquipe === toEquipe) {
      throw new BadRequestException('Source and target team must be different');
    }

    // Find the training for the target equipe
    const targetTraining = await this.trainingModel.findOne({ targetPhase: toEquipe });
    if (targetTraining) {
      // Check if user completed the target equipe's training
      const completedTraining = await this.userTrainingModel.findOne({
        userId: new Types.ObjectId(userId),
        trainingId: targetTraining._id,
        status: UserTrainingStatus.COMPLETED,
      });
      if (!completedTraining) {
        throw new ForbiddenException(
          `You must complete the "${targetTraining.title}" training before requesting a transfer to ${toEquipe}.`
        );
      }
    }

    // Check for pending request already
    const existing = await this.transferModel.findOne({
      userId: new Types.ObjectId(userId),
      status: TransferStatus.PENDING,
    });
    if (existing) {
      throw new ConflictException('You already have a pending transfer request');
    }

    return this.transferModel.create({
      userId: new Types.ObjectId(userId),
      fromEquipe,
      toEquipe,
      reason,
    });
  }

  async getMyTransferRequests(userId: string) {
    return this.transferModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ─── Admin: Manage Transfer Requests ────────────────────────────────────────

  async getAllTransferRequests() {
    return this.transferModel
      .find()
      .populate('userId', 'firstName lastName email equipe role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async approveTransferRequest(requestId: string, adminId: string, userModel: Model<any>) {
    const req = await this.transferModel.findById(requestId);
    if (!req) throw new NotFoundException('Transfer request not found');
    if (req.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    // Update user equipe
    await userModel.findByIdAndUpdate(req.userId, { equipe: req.toEquipe });

    req.status = TransferStatus.APPROVED;
    req.reviewedBy = new Types.ObjectId(adminId);
    await req.save();
    return req;
  }

  async rejectTransferRequest(requestId: string, adminId: string, adminNote: string) {
    const req = await this.transferModel.findById(requestId);
    if (!req) throw new NotFoundException('Transfer request not found');
    if (req.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    req.status = TransferStatus.REJECTED;
    req.adminNote = adminNote || 'Request rejected';
    req.reviewedBy = new Types.ObjectId(adminId);
    await req.save();
    return req;
  }

  // ─── Admin: Stats ────────────────────────────────────────────────────────────

  async getFormationStats(formationId: string) {
    const records = await this.userTrainingModel
      .find({ trainingId: new Types.ObjectId(formationId) })
      .lean();
    const total     = records.length;
    const completed = records.filter(r => r.status === UserTrainingStatus.COMPLETED).length;
    const inProgress= records.filter(r => r.status === UserTrainingStatus.IN_PROGRESS).length;
    const failed    = records.filter(r => r.status === UserTrainingStatus.FAILED).length;
    const avgScore  = records.filter(r => r.quizScore !== null).reduce((a, r) => a + (r.quizScore || 0), 0) / (records.filter(r => r.quizScore !== null).length || 1);
    return { total, completed, inProgress, failed, avgScore: Math.round(avgScore) };
  }

  async getAllUsersProgress() {
    return this.userTrainingModel
      .find()
      .populate('userId', 'firstName lastName email equipe role')
      .populate('trainingId', 'title targetPhase')
      .lean()
      .exec();
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  async seedFormations() {
    const defaultFormations = [
      {
        title: 'Low Level Requirements (LLR)',
        targetPhase: 'LLR',
        durationWeeks: 1,
        quizDurationMinutes: 30,
        passingScore: 80,
        description: 'LLR authoring/review flow.',
        materials: [],
        lessons: [],
        quiz: [],
      },
      {
        title: 'Low Level Testing (LLT)',
        targetPhase: 'LLT',
        durationWeeks: 2,
        quizDurationMinutes: 45,
        passingScore: 80,
        description: 'MCDC and Unit testing.',
        materials: [],
        lessons: [],
        quiz: [],
      },
      {
        title: 'High Level Testing (HLT)',
        targetPhase: 'HLT',
        durationWeeks: 2,
        quizDurationMinutes: 45,
        passingScore: 80,
        description: 'High Level testing for Aerospace.',
        materials: [],
        lessons: [],
        quiz: [],
      },
    ];

    for (const f of defaultFormations) {
      const exists = await this.trainingModel.findOne({ title: f.title });
      if (!exists) await this.trainingModel.create(f);
    }
    return { seeded: true };
  }
}
