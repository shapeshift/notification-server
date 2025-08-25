import { getRequiredEnvVar } from './index';

export class UserServiceClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = getRequiredEnvVar('USER_SERVICE_URL');
  }

  async getUserById(userId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserByAccountId(accountId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/users/account/${accountId}`);
    if (!response.ok) {
      throw new Error(`Failed to get user by account ID: ${response.statusText}`);
    }
    return response.json();
  }

  async getOrCreateUserByAccountIds(accountIds: string[]) {
    const response = await fetch(`${this.baseUrl}/api/v1/users/get-or-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountIds }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get or create user: ${response.statusText}`);
    }
    return response.json();
  }

  async getUserDevices(userId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}/devices`);
    if (!response.ok) {
      throw new Error(`Failed to get user devices: ${response.statusText}`);
    }
    return response.json();
  }
}

export class NotificationsServiceClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = getRequiredEnvVar('NOTIFICATIONS_SERVICE_URL');
  }

  async createNotification(data: {
    userId: string;
    title: string;
    body: string;
    type: 'SWAP_STATUS_UPDATE' | 'SWAP_COMPLETED' | 'SWAP_FAILED';
    swapId?: string;
    deviceId?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create notification: ${response.statusText}`);
    }
    return response.json();
  }

  async sendNotificationToUser(data: {
    userId: string;
    title: string;
    body: string;
    data?: any;
  }) {
    const response = await fetch(`${this.baseUrl}/api/v1/notifications/send-to-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to send notification to user: ${response.statusText}`);
    }
    return response.json();
  }
}
