import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
    const { id, displayName, emails, username } = profile;
    const user = {
      provider: 'github',
      providerId: id,
      email: emails ? emails[0].value : `${username}@github.com`,
      firstName: displayName ? displayName.split(' ')[0] : username,
      lastName: displayName ? displayName.split(' ')[1] || '' : '',
    };
    done(null, user);
  }
}
