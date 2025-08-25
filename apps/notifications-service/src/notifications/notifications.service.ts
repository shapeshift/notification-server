import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { 
  Notification, 
  CreateNotificationDto,
  PushNotificationData
} from '@shapeshift/shared-types';
import { getRequiredEnvVar } from '@shapeshift/shared-utils';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  }

  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          body: data.body,
          type: data.type,
          swapId: data.swapId,
          deviceId: data.deviceId,
        },
      });

      // Send push notification to all user devices
      await this.sendPushNotification(notification as any);

      return notification as any;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async sendPushNotification(notification: Notification) {
    try {
      // Get user devices from user service
      const userServiceUrl = getRequiredEnvVar('USER_SERVICE_URL');
      const response = await fetch(`${userServiceUrl}/api/v1/users/${notification.userId}/devices`);
      
      if (!response.ok) {
        this.logger.error(`Failed to fetch user devices: ${response.statusText}`);
        return;
      }

      const devices = await response.json() as any[];
      const activeDevices = devices.filter((device: any) => device.isActive);
      
      if (activeDevices.length === 0) {
        this.logger.log(`No active devices found for user ${notification.userId}`);
        return;
      }

      const messages: ExpoPushMessage[] = activeDevices
        .filter((device: any) => device.deviceType === 'MOBILE')
        .map((device: any) => ({
          to: device.deviceToken,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: notification.id,
            type: notification.type,
            swapId: notification.swapId,
          },
          priority: 'high',
          channelId: 'swap-notifications',
        }));

      await this.sendExpoPushNotifications(messages, notification.id);
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }
  }

  async sendPushNotificationToDevice(
    deviceToken: string, 
    title: string, 
    body: string, 
    data?: PushNotificationData
  ): Promise<boolean> {
    try {
      if (!Expo.isExpoPushToken(deviceToken)) {
        this.logger.warn(`Invalid Expo push token: ${deviceToken}`);
        return false;
      }

      const message: ExpoPushMessage = {
        to: deviceToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: 'swap-notifications',
      };

      const tickets = await this.sendExpoPushNotifications([message]);
      return tickets.length > 0;
    } catch (error) {
      this.logger.error('Failed to send push notification to device', error);
      return false;
    }
  }

  async sendPushNotificationToUser(
    userId: string, 
    title: string, 
    body: string, 
    data?: PushNotificationData
  ): Promise<boolean> {
    try {
      // Get user devices from user service
      const userServiceUrl = getRequiredEnvVar('USER_SERVICE_URL');
      const response = await fetch(`${userServiceUrl}/api/v1/users/${userId}/devices`);
      
      if (!response.ok) {
        this.logger.error(`Failed to fetch user devices: ${response.statusText}`);
        return false;
      }

      const devices = await response.json() as any[];
      const activeDevices = devices.filter((device: any) => device.isActive);

      if (activeDevices.length === 0) {
        this.logger.log(`No active devices found for user ${userId}`);
        return false;
      }

      const messages: ExpoPushMessage[] = activeDevices.map((device: any) => ({
        to: device.deviceToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: 'swap-notifications',
      }));

      const tickets = await this.sendExpoPushNotifications(messages);
      return tickets.length > 0;
    } catch (error) {
      this.logger.error('Failed to send push notification to user', error);
      return false;
    }
  }

  private async sendExpoPushNotifications(messages: ExpoPushMessage[], notificationId?: string): Promise<ExpoPushTicket[]> {
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('Error sending chunk', error);
      }
    }

    // Update notification with delivery timestamp if notificationId is provided
    if (notificationId) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { deliveredAt: new Date() },
      });
    }

    this.logger.log(`Sent ${tickets.length} push notifications`);

    return tickets;
  }

  async registerDevice(userId: string, deviceToken: string, deviceType: 'MOBILE' | 'WEB') {
    try {
      this.logger.log(`registerDevice called with userId: ${userId}, deviceType: ${deviceType}, deviceToken: ${deviceToken}`);
      
      // Only validate Expo push token for mobile devices
      if (deviceType === 'MOBILE' && !Expo.isExpoPushToken(deviceToken)) {
        throw new Error('Invalid Expo push token');
      }

      // For web devices, we expect a websocket channel identifier
      if (deviceType === 'WEB' && !deviceToken) {
        throw new Error('Invalid websocket channel identifier');
      }

      // Register device with user service
      const userServiceUrl = getRequiredEnvVar('USER_SERVICE_URL');
      const response = await fetch(`${userServiceUrl}/api/v1/users/${userId}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceToken,
          deviceType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register device: ${response.statusText}`);
      }

      const device = await response.json();
      this.logger.log(`Device registered: ${deviceToken} for user ${userId} (${deviceType})`);
      return device;
    } catch (error) {
      this.logger.error('Failed to register device', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    }) as any;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    }) as any;
  }

  async getUserDevices(userId: string) {
    try {
      const userServiceUrl = getRequiredEnvVar('USER_SERVICE_URL');
      const response = await fetch(`${userServiceUrl}/api/v1/users/${userId}/devices`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user devices: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error('Failed to get user devices', error);
      throw error;
    }
  }
}
