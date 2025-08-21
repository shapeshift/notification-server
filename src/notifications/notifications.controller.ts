import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  async registerDevice(
    @Body() data: { userId: string; deviceToken: string; deviceType: 'MOBILE' | 'WEB' },
  ) {
    return this.notificationsService.registerDevice(
      data.userId,
      data.deviceToken,
      data.deviceType,
    );
  }

  @Get('devices/:userId')
  async getUserDevices(@Param('userId') userId: string) {
    return this.notificationsService.getUserDevices(userId);
  }
}
