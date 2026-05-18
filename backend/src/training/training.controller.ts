import {
  Controller, Post, Body, Get, Put, Delete,
  Param, UseGuards, Req, HttpCode,
  UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { extname } from 'path';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { TrainingService } from './training.service';
import { User, UserDocument } from '../user/schemas/user.schema';

@Controller('training')
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ─── Admin: Formation CRUD ──────────────────────────────────────────────────

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createFormation(@Body() payload: any) {
    return this.trainingService.createFormation(payload);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAllFormations() {
    return this.trainingService.getAllFormations();
  }

  // ─── Admin: All users progress ──────────────────────────────────────────────
  // NOTE: Must be BEFORE @Get(':id') to avoid route shadowing

  @Get('admin/all-progress')
  @UseGuards(JwtAuthGuard)
  getAllUsersProgress() {
    return this.trainingService.getAllUsersProgress();
  }

  // ─── Member: My formations ──────────────────────────────────────────────────
  // NOTE: Must be BEFORE @Get(':id') to avoid route shadowing

  @Get('member/my')
  @UseGuards(JwtAuthGuard)
  getMyFormations(@Req() req: any) {
    return this.trainingService.getMyFormations(req.user.userId);
  }

  // ─── Transfer Requests (all GET routes before :id) ─────────────────────────

  @Get('transfer/my')
  @UseGuards(JwtAuthGuard)
  getMyTransferRequests(@Req() req: any) {
    return this.trainingService.getMyTransferRequests(req.user.userId);
  }

  @Get('transfer/all')
  @UseGuards(JwtAuthGuard)
  getAllTransferRequests() {
    return this.trainingService.getAllTransferRequests();
  }

  // ─── Seed (before :id) ──────────────────────────────────────────────────────

  @Post('seed')
  seedDefaultFormations() {
    return this.trainingService.seedFormations();
  }

  // ─── File Upload (before :id) ───────────────────────────────────────────────

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadTrainingFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');

    const ext = extname(file.originalname).toLowerCase();
    const resourceType = ext === '.pdf' ? 'PDF' : 'VIDEO';

    // Build public URL (served via useStaticAssets in main.ts)
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT ?? 3000}`;
    const url = `${baseUrl}/uploads/training/${file.filename}`;

    return { url, resourceType, originalName: file.originalname, size: file.size };
  }

  // ─── Generic :id routes (MUST come AFTER all named routes) ─────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getFormationById(@Param('id') id: string) {
    return this.trainingService.getFormationById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateFormation(@Param('id') id: string, @Body() payload: any) {
    return this.trainingService.updateFormation(id, payload);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteFormation(@Param('id') id: string) {
    return this.trainingService.deleteFormation(id);
  }

  // ─── Admin: Assign members ──────────────────────────────────────────────────

  @Post(':id/assign-members')
  @UseGuards(JwtAuthGuard)
  assignMembers(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @Req() req: any,
  ) {
    return this.trainingService.assignMembersToFormation(id, userIds, req.user.userId);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  getFormationStats(@Param('id') id: string) {
    return this.trainingService.getFormationStats(id);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  startFormation(@Param('id') id: string, @Req() req: any) {
    return this.trainingService.startFormation(req.user.userId, id);
  }

  @Put(':id/progress')
  @UseGuards(JwtAuthGuard)
  updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
    @Req() req: any,
  ) {
    return this.trainingService.updateProgress(req.user.userId, id, progress);
  }

  @Post(':id/submit-quiz')
  @UseGuards(JwtAuthGuard)
  submitQuiz(
    @Param('id') id: string,
    @Body('answers') answers: number[],
    @Req() req: any,
  ) {
    return this.trainingService.submitQuiz(req.user.userId, id, answers);
  }

  @Delete('my/:id')
  @UseGuards(JwtAuthGuard)
  removeMyFormation(@Param('id') id: string, @Req() req: any) {
    return this.trainingService.removeMyFormation(req.user.userId, id);
  }

  // ─── Admin/Manager endpoints ────────────────────────────────────────────────

  @Get(':id/my-progress')
  @UseGuards(JwtAuthGuard)
  getMyProgress(@Param('id') id: string, @Req() req: any) {
    return this.trainingService.getMyProgress(req.user.userId, id);
  }

  // ─── Transfer Request mutations ─────────────────────────────────────────────

  @Post('transfer/request')
  @UseGuards(JwtAuthGuard)
  requestTransfer(@Body() body: any, @Req() req: any) {
    return this.trainingService.requestTransfer(
      req.user.userId,
      body.fromEquipe,
      body.toEquipe,
      body.reason,
    );
  }

  @Put('transfer/:id/approve')
  @UseGuards(JwtAuthGuard)
  approveTransfer(@Param('id') id: string, @Req() req: any) {
    return this.trainingService.approveTransferRequest(id, req.user.userId, this.userModel);
  }

  @Put('transfer/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectTransfer(
    @Param('id') id: string,
    @Body('adminNote') adminNote: string,
    @Req() req: any,
  ) {
    return this.trainingService.rejectTransferRequest(id, req.user.userId, adminNote);
  }
}
