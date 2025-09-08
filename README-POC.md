# ShapeShift Push Notifications POC

This is a proof of concept for implementing server-driven push notifications for ShapeShift swaps, addressing the requirements from [GitHub Issue #9903](https://github.com/shapeshift/web/issues/9903).

## 🎯 Overview

The POC demonstrates a complete push notification system that:
- Tracks swap status changes in real-time
- Sends push notifications via Expo
- Provides WebSocket real-time updates
- Polls external swap APIs for status updates
- Manages device registration for multiple platforms
- Implements secure account ID hashing
- Uses proper NestJS dependency injection patterns

## 🏗️ Architecture

### Core Components

1. **Database Layer (Prisma + SQLite)**
   - User management with hashed account IDs
   - Device registration for push notifications
   - Swap tracking with comprehensive metadata
   - Notification history

2. **Notification Service**
   - Expo push notification integration
   - Device registration
   - Notification delivery tracking

3. **Swap Service**
   - Swap creation and status management
   - Integration with external swap APIs
   - Automatic notification triggering
   - Account ID hashing for security

4. **WebSocket Gateway**
   - Real-time communication
   - User authentication
   - Live swap status updates

5. **Chain Adapter Services**
   - Modular chain adapter initialization
   - EVM, UTXO, Cosmos SDK, and Solana support
   - Proper dependency injection pattern

6. **Polling Service**
   - Automated status checking
   - Account-based swap monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file
   echo 'DATABASE_URL="file:./dev.db"' > .env
   echo 'EXPO_ACCESS_TOKEN="your-expo-access-token-here"' >> .env
   echo 'ACCOUNT_ID_SALT="your-secure-salt-here-change-in-production"' >> .env
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Create database:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the server:**
   ```bash
   npm run start:dev
   ```

## 📊 Database Schema

### User Management
```sql
-- Users with hashed account IDs
User {
  id: String (CUID)
  createdAt: DateTime
  updatedAt: DateTime
  devices: Device[]
  notifications: Notification[]
  swaps: Swap[]
  userAccounts: UserAccount[]
}

-- Many-to-many relationship for account IDs
UserAccount {
  id: String (CUID)
  accountId: String (hashed)
  createdAt: DateTime
  userId: String (foreign key)
}
```

### Device Management
```sql
Device {
  id: String (CUID)
  deviceToken: String (unique, Expo token)
  deviceType: DeviceType (MOBILE/WEB)
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
  userId: String (foreign key)
  notifications: Notification[]
}
```

### Swap Tracking
```sql
Swap {
  id: String (CUID)
  swapId: String (unique, external ID)
  sellAsset: String (JSON)
  buyAsset: String (JSON)
  sellAmountCryptoBaseUnit: String
  expectedBuyAmountCryptoBaseUnit: String
  sellAmountCryptoPrecision: String
  expectedBuyAmountCryptoPrecision: String
  actualBuyAmountCryptoPrecision: String?
  status: SwapStatus (IDLE/PENDING/SUCCESS/FAILED)
  source: String
  swapperName: String
  sellAccountId: String (hashed)
  buyAccountId: String? (hashed)
  receiveAddress: String?
  sellTxHash: String?
  buyTxHash: String?
  txLink: String?
  statusMessage: String?
  isStreaming: Boolean
  estimatedCompletion: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
  metadata: String (JSON)
  chainflipSwapId: Int?
  relayTransactionMetadata: String?
  relayerExplorerTxLink: String?
  relayerTxHash: String?
  stepIndex: Int
  streamingSwapMetadata: String?
  userId: String (foreign key)
  notifications: Notification[]
}
```

### Notifications
```sql
Notification {
  id: String (CUID)
  title: String
  body: String
  type: NotificationType
  sentAt: DateTime
  deliveredAt: DateTime?
  userId: String (foreign key)
  deviceId: String? (foreign key)
  swapId: String? (foreign key)
}
```

## 🔌 API Endpoints

### Notifications
- `POST /notifications/register-device` - Register device for push notifications
- `GET /notifications/devices/:userId` - Get user devices

### Swaps
- `POST /swaps` - Create new swap
- `PUT /swaps/:swapId/status` - Update swap status
- `GET /swaps/user/:userId` - Get user swaps
- `GET /swaps/account/:accountId` - Get swaps by account ID
- `GET /swaps/pending` - Get pending swaps
- `GET /swaps/:swapId` - Get specific swap

## 🔌 WebSocket Events

### Client to Server
- `getNotifications` - Get user notifications
- `getSwaps` - Get user swaps

### Server to Client
- `notification` - New notification received
- `swapUpdate` - Swap status updated

## 🔄 Polling System

### Automated Polling
- **Every 30 seconds**: Poll pending swaps for status updates

## 📱 Push Notifications

### Expo Integration
- Uses `expo-server-sdk` for push notifications
- Supports iOS, Android, and Web platforms
- Automatic chunking for large notification batches
- Delivery tracking and error handling

### Notification Types
- `SWAP_STATUS_UPDATE` - General status updates
- `SWAP_COMPLETED` - Successful swap completion
- `SWAP_FAILED` - Failed swap notifications

## 🔐 Security Features

### Account ID Hashing
- All account IDs are hashed using SHA-256 with a salt
- Salt is configurable via `ACCOUNT_ID_SALT` environment variable
- Consistent hashing across user creation and swap operations

### Type Safety
- All `any` types have been replaced with proper TypeScript types
- Comprehensive type definitions for all services and controllers
- Proper error handling with custom error classes

## 🏛️ Architecture Improvements

### Dependency Injection
- Replaced singleton pattern with proper NestJS services
- Modular chain adapter initialization:
  - `EvmChainAdapterService` - Handles all EVM chains
  - `UtxoChainAdapterService` - Handles UTXO chains
  - `CosmosSdkChainAdapterService` - Handles Cosmos SDK chains
  - `SolanaChainAdapterService` - Handles Solana
- `ChainAdapterManagerService` - Centralized adapter management

### Service Structure
- Each chain type has its own service for better maintainability
- Proper separation of concerns
- Improved testability and modularity

## 🔍 Query Examples

### Find User by Hashed Account ID
```typescript
const user = await prisma.user.findFirst({
  where: {
    userAccounts: {
      some: {
        accountId: hashedAccountId
      }
    }
  }
});
```

### Get Swaps for Hashed Account ID
```typescript
const swaps = await prisma.swap.findMany({
  where: {
    OR: [
      { sellAccountId: hashedAccountId },
      { buyAccountId: hashedAccountId }
    ]
  }
});
```

### Get User with All Related Data
```typescript
const user = await prisma.user.findUnique({
  where: { id: "user-id" },
  include: {
    userAccounts: true,
    devices: true,
    swaps: {
      include: {
        notifications: true
      }
    }
  }
});
```

## 🧪 Testing

### Manual Testing
1. Start the server: `npm run start:dev`
2. Monitor logs for successful operations

### WebSocket Testing
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  // Get notifications
  socket.emit('getNotifications', { limit: 10 });
  
  // Get swaps
  socket.emit('getSwaps', { limit: 10 });
});

socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
});

socket.on('swapUpdate', (swap) => {
  console.log('Swap updated:', swap);
});
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - SQLite database path (`file:./dev.db`)
- `EXPO_ACCESS_TOKEN` - Expo push service access token
- `ACCOUNT_ID_SALT` - Salt for hashing account IDs

### Polling Intervals
- Pending swaps: 30 seconds

## 🚀 Production Considerations

### Database
- Replace SQLite with PostgreSQL for production
- Add database migrations
- Implement connection pooling

### Security
- Add JWT authentication
- Implement rate limiting
- Add input validation and sanitization
- Use strong, unique salt for account ID hashing

### Scalability
- Add Redis for caching
- Implement message queues for notifications
- Add load balancing for WebSocket connections

### Monitoring
- Add logging and metrics
- Implement health checks
- Add error tracking

## 📝 Next Steps

1. **Integration with ShapeShift APIs**
   - Replace mock polling with real API calls
   - Implement proper error handling
   - Add retry mechanisms

2. **Mobile App Integration**
   - Implement Expo push token generation
   - Add notification handling in mobile app
   - Test on real devices

3. **Enhanced Features**
   - Add notification preferences
   - Implement notification templates
   - Add analytics tracking

4. **Production Deployment**
   - Set up CI/CD pipeline
   - Configure production database
   - Add monitoring and alerting

## 🤝 Contributing

This POC is designed to be easily extensible. Key areas for contribution:
- Additional swap providers
- Enhanced notification types
- Mobile app integration
- Performance optimizations

## 📄 License

This POC is for demonstration purposes and follows the same license as the main ShapeShift project.
