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

 async validateUser(email: string, pass: string): Promise<any> {
  const user = await this.userModel.findOne({ email }).select('+passwordHash');
  if (user && user.passwordHash) {
   const bcrypt = await import('bcrypt');
   const isMatch = await bcrypt.compare(pass, user.passwordHash);
   if (isMatch) {
    const { passwordHash, ...result } = user.toObject();
    return result;
   }
  }
  return null;
 }

 async login(user: any) {
  const payload = { email: user.email, sub: user._id, role: user.role, equipe: user.equipe || '' };
  return {
   access_token: this.jwtService.sign(payload),
  };
 }

 // ENTERPRISE SSO UPSERT PATTERN
 async validateOAuthUser(profile: any) {
  let user = await this.userModel.findOne({ email: profile.email });
  
  if (!user) {
   // User doesn't exist, we Insert them safely based on Auth Provider
   user = await this.userModel.create({
    email: profile.email,
    firstName: profile.firstName || 'Unknown',
    lastName: profile.lastName || 'Unknown',
    provider: profile.provider,
    providerId: profile.providerId,
    isActive: true
   });
  } else {
   // User exists. Update the provider logic if they swapped from Local to Social
   if (!user.providerId) {
    user.provider = profile.provider;
    user.providerId = profile.providerId;
    // Fix for ValidationError: Path `firstName` is required on existing incomplete docs
    if (!user.firstName) user.firstName = profile.firstName || 'Unknown';
    if (!user.lastName) user.lastName = profile.lastName || 'Unknown';
    
    // Also avoid validation lock by using findByIdAndUpdate instead of save()
    // Or we can just save since we added the fallbacks it will pass validation.
    await user.save();
   }
  }

  // Explicitly guarantee role presence for JWT payload
  const payload = { 
   email: user.email, 
   sub: user._id, 
   role: user.role || 'MEMBER',
   equipe: user.equipe || ''
  };
  
  return {
   access_token: this.jwtService.sign(payload),
  };
 }
}
