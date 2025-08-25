// User-related types
export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userAccounts: UserAccount[];
  devices: Device[];
}

export interface UserAccount {
  id: string;
  accountId: string;
  createdAt: Date;
  userId: string;
}

export interface Device {
  id: string;
  deviceToken: string;
  deviceType: DeviceType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export type DeviceType = 'MOBILE' | 'WEB';

// Swap-related types
export interface Swap {
  id: string;
  swapId: string;
  sellAsset: string;
  buyAsset: string;
  sellAmountCryptoBaseUnit: string;
  expectedBuyAmountCryptoBaseUnit: string;
  sellAmountCryptoPrecision: string;
  expectedBuyAmountCryptoPrecision: string;
  actualBuyAmountCryptoPrecision?: string;
  status: SwapStatus;
  source: string;
  swapperName: string;
  sellAccountId: string;
  buyAccountId?: string;
  receiveAddress?: string;
  sellTxHash?: string;
  buyTxHash?: string;
  txLink?: string;
  statusMessage?: string;
  isStreaming: boolean;
  estimatedCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: string;
  chainflipSwapId?: number;
  relayTransactionMetadata?: string;
  relayerExplorerTxLink?: string;
  relayerTxHash?: string;
  stepIndex: number;
  streamingSwapMetadata?: string;
  userId: string;
  notifications: Notification[];
}

export type SwapStatus = 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED';

// Notification types
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  sentAt: Date;
  deliveredAt?: Date;
  userId: string;
  deviceId?: string;
  swapId?: string;
}

export type NotificationType = 'SWAP_STATUS_UPDATE' | 'SWAP_COMPLETED' | 'SWAP_FAILED';

// DTOs
export interface CreateUserDto {
  accountIds: string[];
}

export interface AddAccountIdDto {
  userId: string;
  accountId: string;
}

export interface RegisterDeviceDto {
  userId: string;
  deviceToken: string;
  deviceType: DeviceType;
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  swapId?: string;
  deviceId?: string;
}

export interface PushNotificationData {
  notificationId?: string;
  type?: string;
  swapId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateSwapDto {
  swapId: string;
  userId: string;
  sellAsset: any;
  buyAsset: any;
  sellTxHash: string;
  sellAmountCryptoBaseUnit: string;
  expectedBuyAmountCryptoBaseUnit: string;
  sellAmountCryptoPrecision: string;
  expectedBuyAmountCryptoPrecision: string;
  source: string;
  swapperName: string;
  sellAccountId: string;
  buyAccountId?: string;
  receiveAddress?: string;
  isStreaming?: boolean;
  metadata?: string;
}

export interface UpdateSwapStatusDto {
  swapId: string;
  status: SwapStatus;
  sellTxHash?: string;
  buyTxHash?: string;
  txLink?: string;
  statusMessage?: string;
  actualBuyAmountCryptoPrecision?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SwapStatusResponse {
  status: 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED';
  sellTxHash?: string;
  buyTxHash?: string;
  statusMessage: string;
}
