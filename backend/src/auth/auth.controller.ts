import { Controller, Get, Req, UseGuards, Res, Post, Body } from '@nestjs/common';
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
  res.redirect(`${process.env.FRONTEND_URL}/login?token=${tokenParams.access_token}`);
 }

 @Get('github')
 @UseGuards(AuthGuard('github'))
 async githubAuth(@Req() req) {}

 @Get('github/callback')
 @UseGuards(AuthGuard('github'))
 async githubAuthRedirect(@Req() req, @Res() res) {
  const tokenParams = await this.authService.validateOAuthUser(req.user);
  res.redirect(`${process.env.FRONTEND_URL}/login?token=${tokenParams.access_token}`);
 }

 @Post('login')
 async login(@Body() body: any) {
  const user = await this.authService.validateUser(body.email, body.password);
  if (!user) {
   return { message: 'Invalid credentials' };
  }
  return this.authService.login(user);
 }

 @Post('register')
 async register(@Body() body: any) {
  // This will be used by Admin to create others or self-register if public
  return this.authService.validateOAuthUser({
   email: body.email,
   firstName: body.firstName,
   lastName: body.lastName,
   provider: 'local',
   role: body.role || 'MEMBER'
  });
 }
}
