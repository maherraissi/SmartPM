import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.userService.updateRole(id, body.role as any);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
