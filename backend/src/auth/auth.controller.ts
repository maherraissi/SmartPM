import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const tokenParams = await this.authService.validateOAuthUser(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/manager?token=${tokenParams.access_token}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req, @Res() res) {
    const tokenParams = await this.authService.validateOAuthUser(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/manager?token=${tokenParams.access_token}`);
  }
}
