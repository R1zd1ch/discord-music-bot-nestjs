import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: { discordId: string }) {
    return this.userService.create(createUserDto.discordId);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':discordId')
  getUser(@Param('discordId') discordId: string) {
    return this.userService.getUser(discordId);
  }

  @Delete(':discordId')
  deleteUser(@Param('discordId') discordId: string) {
    return this.userService.delete(discordId);
  }
}
