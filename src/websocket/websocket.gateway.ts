import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { SwapsService } from '../swaps/swaps.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private notificationsService: NotificationsService,
    private swapsService: SwapsService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      this.connectedClients.delete(client.userId);
    }
  }

  @SubscribeMessage('getNotifications')
  async handleGetNotifications(
    @MessageBody() data: { limit?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const notifications = await this.notificationsService.getUserNotifications(
        client.userId,
        data.limit || 50,
      );
      return { success: true, notifications };
    } catch (error) {
      this.logger.error('Failed to get notifications', error);
      return { error: 'Failed to get notifications' };
    }
  }

  @SubscribeMessage('getSwaps')
  async handleGetSwaps(
    @MessageBody() data: { limit?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const swaps = await this.swapsService.getSwapsByUser(
        client.userId,
        data.limit || 50,
      );
      return { success: true, swaps };
    } catch (error) {
      this.logger.error('Failed to get swaps', error);
      return { error: 'Failed to get swaps' };
    }
  }

  async sendNotificationToUser(userId: string, notification: { 
    id: string; 
    title: string; 
    body: string; 
    type: string; 
    swapId?: string; 
  }) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit('notification', notification);
    }
    
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  async sendSwapUpdateToUser(userId: string, swap: { 
    id: string; 
    swapId: string; 
    status: string; 
    sellAsset: string; 
    buyAsset: string; 
    sellAmountCryptoBaseUnit: string; 
    expectedBuyAmountCryptoBaseUnit: string; 
    sellAccountId: string; 
    buyAccountId?: string; 
    sellTxHash?: string; 
    buyTxHash?: string; 
    statusMessage?: string; 
  }) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit('swapUpdate', swap);
    }
    
    this.server.to(`user:${userId}`).emit('swapUpdate', swap);
  }

  broadcastToAll(event: string, data: Record<string, unknown>) {
    this.server.emit(event, data);
  }
}
