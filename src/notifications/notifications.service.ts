import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body: string;
  type: 'SWAP_STATUS_UPDATE' | 'SWAP_COMPLETED' | 'SWAP_FAILED';
  swapId?: string;
  deviceId?: string;
}

export interface PushNotificationData {
  notificationId?: string;
  type?: string;
  swapId?: string;
  [key: string]: string | number | boolean | undefined;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  }

  async createNotification(data: CreateNotificationDto) {
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
        include: {
          user: {
            include: {
              devices: true,
            },
          },
          swap: true,
        },
      });

      // Send push notification to all user devices
      await this.sendPushNotification(notification);

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async sendPushNotification(notification: { 
    id: string; 
    userId: string; 
    title: string; 
    body: string; 
    type: string; 
    swapId?: string; 
    user: { 
      devices: Array<{ 
        deviceToken: string; 
        deviceType: 'MOBILE' | 'WEB'; 
        isActive: boolean; 
      }>; 
    }; 
  }) {
    try {
      const devices = notification.user.devices.filter((device) => device.isActive);
      
      if (devices.length === 0) {
        this.logger.log(`No active devices found for user ${notification.userId}`);
        return;
      }

      const messages: ExpoPushMessage[] = devices.filter((device) => device.deviceType === 'MOBILE').map((device) => ({
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
  ) {
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
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          devices: {
            where: { isActive: true },
          },
        },
      });

      if (!user || user.devices.length === 0) {
        this.logger.log(`No active devices found for user ${userId}`);
        return false;
      }

      const messages: ExpoPushMessage[] = user.devices.map((device) => ({
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

  private async sendExpoPushNotifications(messages: ExpoPushMessage[], notificationId?: string) {
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

  private async handleInvalidDevice(receiptId: string) {
    try {
      // Find and deactivate the device with this receipt
      // This is a simplified approach - you might want to store receipt-to-device mapping
      this.logger.warn(`Device with receipt ${receiptId} is no longer registered`);
    } catch (error) {
      this.logger.error('Failed to handle invalid device', error);
    }
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

      const device = await this.prisma.device.upsert({
        where: { deviceToken },
        update: {
          isActive: true,
          deviceType,
          userId,
        },
        create: {
          deviceToken,
          deviceType,
          userId,
        },
      });

      this.logger.log(`Device registered: ${deviceToken} for user ${userId} (${deviceType})`);
      return device;
    } catch (error) {
      this.logger.error('Failed to register device', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        swap: true,
      },
    });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async getUserDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { 
        userId,
        isActive: true,
      },
    });
  }
}
