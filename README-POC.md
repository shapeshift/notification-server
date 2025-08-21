# ShapeShift Push Notifications POC

This is a proof of concept for implementing server-driven push notifications for ShapeShift swaps, addressing the requirements from [GitHub Issue #9903](https://github.com/shapeshift/web/issues/9903).

## 🎯 Overview

The POC demonstrates a complete push notification system that:
- Tracks swap status changes in real-time
- Sends push notifications via Expo
- Provides WebSocket real-time updates
- Polls external swap APIs for status updates
- Manages device registration for multiple platforms

## 🏗️ Architecture

### Core Components

1. **Database Layer (Prisma + SQLite)**
   - User management with account IDs
   - Device registration for push notifications
   - Swap tracking with comprehensive metadata
   - Notification history

2. **Notification Service**
   - Expo push notification integration
   - Device registration/unregistration
   - Notification delivery tracking

3. **Swap Service**
   - Swap creation and status management
   - Integration with external swap APIs
   - Automatic notification triggering

4. **WebSocket Gateway**
   - Real-time communication
   - User authentication
   - Live swap status updates

5. **Polling Service**
   - Automated status checking
   - Account-based swap monitoring
   - Cleanup of old data

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
   echo 'SHAPESHIFT_API_KEY="your-shapeshift-api-key-here"' >> .env
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Create database:**
   ```bash
   npx prisma db push
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
  email: String (unique)
  walletAddress: String (unique)
  accountIds: String (JSON array)
}

-- Many-to-many relationship for account IDs
UserAccount {
  id: String (CUID)
  accountId: String (hashed)
  userId: String (foreign key)
}
```

### Device Management
```sql
Device {
  id: String (CUID)
  deviceToken: String (unique, Expo token)
  deviceType: DeviceType (IOS/ANDROID/WEB)
  isActive: Boolean
  userId: String (foreign key)
}
```

### Swap Tracking
```sql
Swap {
  id: String (CUID)
  swapId: String (unique, external ID)
  sellAsset: String (Asset ID)
  buyAsset: String (Asset ID)
  sellAmountCryptoBaseUnit: String
  expectedBuyAmountCryptoBaseUnit: String
  status: SwapStatus (IDLE/PENDING/SUCCESS/FAILED)
  source: String (SwapSource)
  swapperName: String (SwapperName)
  sellAccountId: String (AccountId)
  buyAccountId: String? (AccountId)
  sellTxHash: String?
  buyTxHash: String?
  metadata: String (JSON)
  userId: String (foreign key)
}
```

### Notifications
```sql
Notification {
  id: String (CUID)
  title: String
  body: String
  type: NotificationType
  isRead: Boolean
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
- `POST /notifications/unregister-device` - Unregister device
- `GET /notifications/user/:userId` - Get user notifications
- `PUT /notifications/:notificationId/read` - Mark notification as read
- `POST /notifications/test` - Send test notification

### Swaps
- `POST /swaps` - Create new swap
- `PUT /swaps/:swapId/status` - Update swap status
- `GET /swaps/user/:userId` - Get user swaps
- `GET /swaps/account/:accountId` - Get swaps by account ID
- `GET /swaps/pending` - Get pending swaps
- `POST /swaps/:swapId/poll` - Manually poll swap status
- `GET /swaps/:swapId` - Get specific swap

## 🔌 WebSocket Events

### Client to Server
- `authenticate` - Authenticate user
- `registerDevice` - Register device via WebSocket
- `unregisterDevice` - Unregister device
- `getNotifications` - Get user notifications
- `markNotificationRead` - Mark notification as read
- `getSwaps` - Get user swaps

### Server to Client
- `notification` - New notification received
- `swapUpdate` - Swap status updated

## 🔄 Polling System

### Automated Polling
- **Every 30 seconds**: Poll pending swaps for status updates
- **Every minute**: Poll swaps by account ID
- **Daily at midnight**: Clean up old completed swaps

### Manual Polling
- `POST /swaps/:swapId/poll` - Manually trigger status check

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

## 🔍 Query Examples

### Find User by Account ID
```typescript
const user = await prisma.user.findFirst({
  where: {
    userAccounts: {
      some: {
        accountId: "hashed-account-id"
      }
    }
  }
});
```

### Get Swaps for Account
```typescript
const swaps = await prisma.swap.findMany({
  where: {
    OR: [
      { sellAccountId: "account-id" },
      { buyAccountId: "account-id" }
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
2. Run test script: `node test-poc.js`
3. Monitor logs for successful operations

### WebSocket Testing
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('authenticate', { userId: 'test-user' });
});

socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
});
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - SQLite database path
- `EXPO_ACCESS_TOKEN` - Expo push service access token
- `SHAPESHIFT_API_KEY` - ShapeShift API key (for production)

### Polling Intervals
- Pending swaps: 30 seconds
- Account-based polling: 1 minute
- Cleanup: Daily at midnight

## 🚀 Production Considerations

### Database
- Replace SQLite with PostgreSQL for production
- Add database migrations
- Implement connection pooling

### Security
- Add JWT authentication
- Implement rate limiting
- Add input validation and sanitization

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
