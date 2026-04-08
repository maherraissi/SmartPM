import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubActivity, SubActivityDocument } from './schemas/sub-activity.schema';

@Injectable()
export class SubActivityService {
  constructor(@InjectModel(SubActivity.name) private subModel: Model<SubActivityDocument>) {}

  async attachFile(id: string, fileData: { name: string; url: string }) {
    return this.subModel.findByIdAndUpdate(
      id,
      { $push: { attachedFiles: fileData } },
      { new: true }
    );
  }
}
