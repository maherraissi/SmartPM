import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
 imports: [
  MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  PassportModule,
  JwtModule.register({
   secret: process.env.JWT_SECRET || 'super-secret-key-aerospace-99',
   signOptions: { expiresIn: '8h' }, // 8 hours = duration of 1 aerospace operational shift
  }),
 ],
 providers: [AuthService, GoogleStrategy, GithubStrategy, JwtStrategy],
 controllers: [AuthController],
})
export class AuthModule {}
