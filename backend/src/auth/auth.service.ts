import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  // ENTERPRISE SSO UPSERT PATTERN
  async validateOAuthUser(profile: any) {
    let user = await this.userModel.findOne({ email: profile.email });
    
    if (!user) {
      // User doesn't exist, we Insert them safely based on Auth Provider
      user = await this.userModel.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        provider: profile.provider,
        providerId: profile.providerId,
        isActive: true
      });
    } else {
      // User exists. Update the provider logic if they swapped from Local to Social
      if (!user.providerId) {
        user.provider = profile.provider;
        user.providerId = profile.providerId;
        await user.save();
      }
    }

    // Token creation tailored for 8-hours aerospace shifts
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
