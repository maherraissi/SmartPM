import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
 constructor() {
  super({
   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
   ignoreExpiration: false,
   secretOrKey: process.env.JWT_SECRET || 'super-secret-key-aerospace-99',
  });
 }

 async validate(payload: any) {
  // Translates the Token into the req.user object seamlessly
  return { userId: payload.sub, email: payload.email, role: payload.role };
 }
}
