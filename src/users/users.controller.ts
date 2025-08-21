import { Controller, Post, Get, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { UsersService, AddAccountIdDto } from './users.service';
import type { CreateUserDto } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    return this.usersService.createUser(data);
  }

  @Post('get-or-create')
  async getOrCreateUser(@Body() data: { accountIds: string[] }) {
    return this.usersService.getOrCreateUserByAccountIds(data.accountIds);
  }

  @Get()
  async getAllUsers(@Query('limit') limit?: string) {
    return this.usersService.getAllUsers(limit ? parseInt(limit) : 50);
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Get('account/:accountId')
  async getUserByAccountId(@Param('accountId') accountId: string) {
    return this.usersService.getUserByAccountId(accountId);
  }

  @Get('exists/account/:accountId')
  async userExistsWithAccountId(@Param('accountId') accountId: string) {
    const exists = await this.usersService.userExistsWithAccountId(accountId);
    return { exists };
  }

  @Post('get-or-create-by-account')
  async getOrCreateUserByAccountId(@Body() data: { accountId: string }) {
    return this.usersService.getOrCreateUserByAccountId(data.accountId);
  }

  @Post(':userId/account-ids')
  async addAccountIds(
    @Param('userId') userId: string,
    @Body() data: { accountIds: string[] },
  ) {
    return this.usersService.addAccountIds(userId, data.accountIds);
  }

  @Post(':userId/account-id')
  async addAccountId(
    @Param('userId') userId: string,
    @Body() data: { accountId: string },
  ) {
    return this.usersService.addAccountId({
      userId,
      accountId: data.accountId,
    });
  }
}
