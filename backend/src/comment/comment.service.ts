import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>
  ) {}

  async create(authorId: string, text: string, projectId?: string): Promise<Comment> {
    const newComment = new this.commentModel({
      authorId,
      text,
      projectId: projectId || null
    });
    return (await newComment.save()).populate('authorId', 'name');
  }

  async findAll(projectId?: string): Promise<Comment[]> {
    const query = projectId ? { projectId } : {};
    return this.commentModel.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('authorId', 'name')
      .exec();
  }
}
