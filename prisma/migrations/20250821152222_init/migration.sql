-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "user_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceToken" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "swaps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "swapId" TEXT NOT NULL,
    "sellAsset" TEXT NOT NULL,
    "buyAsset" TEXT NOT NULL,
    "sellAmountCryptoBaseUnit" TEXT NOT NULL,
    "expectedBuyAmountCryptoBaseUnit" TEXT NOT NULL,
    "sellAmountCryptoPrecision" TEXT NOT NULL,
    "expectedBuyAmountCryptoPrecision" TEXT NOT NULL,
    "actualBuyAmountCryptoPrecision" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL,
    "swapperName" TEXT NOT NULL,
    "sellAccountId" TEXT NOT NULL,
    "buyAccountId" TEXT,
    "receiveAddress" TEXT,
    "sellTxHash" TEXT,
    "buyTxHash" TEXT,
    "txLink" TEXT,
    "statusMessage" TEXT,
    "isStreaming" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCompletion" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" TEXT NOT NULL,
    "chainflipSwapId" INTEGER,
    "relayTransactionMetadata" TEXT,
    "relayerExplorerTxLink" TEXT,
    "relayerTxHash" TEXT,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "streamingSwapMetadata" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "swaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "swapId" TEXT,
    CONSTRAINT "notifications_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notifications_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "swaps" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_userId_accountId_key" ON "user_accounts"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceToken_key" ON "devices"("deviceToken");

-- CreateIndex
CREATE UNIQUE INDEX "swaps_swapId_key" ON "swaps"("swapId");
