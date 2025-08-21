import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EvmChainAdapterService } from '../lib/chain-adapters/evm.service';
import { UtxoChainAdapterService } from '../lib/chain-adapters/utxo.service';
import { CosmosSdkChainAdapterService } from '../lib/chain-adapters/cosmos-sdk.service';
import { SolanaChainAdapterService } from '../lib/chain-adapters/solana.service';
import { SwapperName, swappers, SwapSource, SwapStatus } from '@shapeshiftoss/swapper';
import { ChainId } from '@shapeshiftoss/caip';
import { Asset } from '@shapeshiftoss/types';
import * as crypto from 'crypto';

export interface CreateSwapDto {
  swapId: string;
  userId: string;
  sellAsset: Asset;
  buyAsset: Asset;
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
  status: 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED';
  sellTxHash?: string;
  buyTxHash?: string;
  txLink?: string;
  statusMessage?: string;
  actualBuyAmountCryptoPrecision?: string;
}

export interface SwapStatusResponse {
  status: 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED';
  sellTxHash?: string;
  buyTxHash?: string;
  statusMessage: string;
}

@Injectable()
export class SwapsService {
  private readonly logger = new Logger(SwapsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private evmChainAdapterService: EvmChainAdapterService,
    private utxoChainAdapterService: UtxoChainAdapterService,
    private cosmosSdkChainAdapterService: CosmosSdkChainAdapterService,
    private solanaChainAdapterService: SolanaChainAdapterService,
  ) {}

  private hashAccountId(accountId: string): string {
    const salt = process.env.ACCOUNT_ID_SALT;
    return crypto.createHash('sha256').update(accountId + salt).digest('hex');
  }

  async createSwap(data: CreateSwapDto) {
    try {
      const swap = await this.prisma.swap.create({
        data: {
          swapId: data.swapId,
          sellAsset: JSON.stringify(data.sellAsset),
          buyAsset: JSON.stringify(data.buyAsset),
          sellTxHash: data.sellTxHash,
          sellAmountCryptoBaseUnit: data.sellAmountCryptoBaseUnit,
          expectedBuyAmountCryptoBaseUnit: data.expectedBuyAmountCryptoBaseUnit,
          sellAmountCryptoPrecision: data.sellAmountCryptoPrecision,
          expectedBuyAmountCryptoPrecision: data.expectedBuyAmountCryptoPrecision,
          source: data.source,
          swapperName: data.swapperName,
          sellAccountId: this.hashAccountId(data.sellAccountId),
          buyAccountId: data.buyAccountId ? this.hashAccountId(data.buyAccountId) : null,
          receiveAddress: data.receiveAddress,
          isStreaming: data.isStreaming || false,
          metadata: data.metadata || '{}',
          user: {
            connect: {
              id: data.userId,
            },
          }
        },
        include: {
          user: true,
        },
      });

      this.logger.log(`Swap created: ${swap.id}`);
      return swap;
    } catch (error) {
      this.logger.error('Failed to create swap', error);
      throw error;
    }
  }

  async updateSwapStatus(data: UpdateSwapStatusDto) {
    try {
      const swap = await this.prisma.swap.update({
        where: { swapId: data.swapId },
        data: {
          status: data.status,
          sellTxHash: data.sellTxHash,
          buyTxHash: data.buyTxHash,
          txLink: data.txLink,
          statusMessage: data.statusMessage,
          actualBuyAmountCryptoPrecision: data.actualBuyAmountCryptoPrecision,
        },
        include: {
          user: true,
        },
      });

      await this.sendStatusUpdateNotification(swap);

      this.logger.log(`Swap status updated: ${swap.swapId} -> ${data.status}`);
      return swap;
    } catch (error) {
      this.logger.error('Failed to update swap status', error);
      throw error;
    }
  }

  private async sendStatusUpdateNotification(swap: { 
    id: string; 
    userId: string; 
    status: string; 
    sellAsset: string; 
    buyAsset: string; 
  }) {
    let title: string;
    let body: string;
    let type: 'SWAP_STATUS_UPDATE' | 'SWAP_COMPLETED' | 'SWAP_FAILED';

    // Parse the Asset objects from JSON strings
    const sellAsset: Asset = JSON.parse(swap.sellAsset);
    const buyAsset: Asset = JSON.parse(swap.buyAsset);

    switch (swap.status) {
      case 'SUCCESS':
        title = 'Swap Completed!';
        body = `Your ${sellAsset.symbol} to ${buyAsset.symbol} swap has been completed successfully`;
        type = 'SWAP_COMPLETED';
        break;
      case 'FAILED':
        title = 'Swap Failed';
        body = `Your ${sellAsset.symbol} to ${buyAsset.symbol} swap has failed`;
        type = 'SWAP_FAILED';
        break;
      default:
        return;
    }

    if (swap.status === 'FAILED' || swap.status === 'SUCCESS') {
      await this.notificationsService.createNotification({
        userId: swap.userId,
        title,
        body,
        type,
        swapId: swap.id,
      });
    }
  }

  async getSwapsByUser(userId: string, limit = 50) {
    const swaps = await this.prisma.swap.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    });

    return swaps.map(swap => ({
      ...swap,
      sellAsset: JSON.parse(swap.sellAsset) as Asset,
      buyAsset: JSON.parse(swap.buyAsset) as Asset,
    }));
  }

  async getSwapsByAccountId(accountId: string) {
    const hashedAccountId = this.hashAccountId(accountId);
    const swaps = await this.prisma.swap.findMany({
      where: {
        OR: [
          { sellAccountId: hashedAccountId },
          { buyAccountId: hashedAccountId },
        ],
      },
      include: {
        user: {
          include: {
            devices: true,
          },
        },
      },
    });

    return swaps.map(swap => ({
      ...swap,
      sellAsset: JSON.parse(swap.sellAsset) as Asset,
      buyAsset: JSON.parse(swap.buyAsset) as Asset,
    }));
  }

  async getPendingSwaps() {
    const swaps = await this.prisma.swap.findMany({
      where: {
        status: {
          in: ['IDLE', 'PENDING'],
        },
      },
      include: {
        user: {
          include: {
            devices: true,
          },
        },
      },
    });

    const sellAsset: Asset = JSON.parse(swaps[0].sellAsset);
    const buyAsset: Asset = JSON.parse(swaps[0].buyAsset);

    return swaps.map(swap => ({
      ...swap,
      sellAsset,
      buyAsset,
    }));
  }

  async pollSwapStatus(swapId: string): Promise<SwapStatusResponse> {
    try {
      this.logger.log(`Polling status for swap: ${swapId}`);
      
      const swap = await this.prisma.swap.findUnique({
        where: { swapId },
        include: { user: true },
      });
      
      if (!swap) {
        throw new Error(`Swap not found: ${swapId}`);
      }

      const sellAsset: Asset = JSON.parse(swap.sellAsset);
      const buyAsset: Asset = JSON.parse(swap.buyAsset);

      const swapper = swappers[swap.swapperName];
      
      if (!swapper) {
        throw new Error(`Swapper not found: ${swap.swapperName}`);
      }

      if (!swap.sellTxHash) {
        throw new Error('Sell tx hash is required');
      }

      const status = await swapper.checkTradeStatus({
        txHash: swap.sellTxHash ?? '',
        chainId: sellAsset.chainId as ChainId,
        address: swap.sellAccountId,
        swap: {
          id: swap.swapId,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
          expectedBuyAmountCryptoBaseUnit: swap.expectedBuyAmountCryptoBaseUnit,
          sellAmountCryptoPrecision: swap.sellAmountCryptoPrecision,
          expectedBuyAmountCryptoPrecision: swap.expectedBuyAmountCryptoPrecision,
          source: swap.source as SwapSource,
          swapperName: swap.swapperName as SwapperName,
          sellAccountId: swap.sellAccountId,
          buyAccountId: swap.buyAccountId || undefined,
          receiveAddress: swap.receiveAddress || undefined,
          isStreaming: swap.isStreaming,
          metadata: swap.metadata ? JSON.parse(swap.metadata) : {},
          createdAt: swap.createdAt.getTime(),
          updatedAt: swap.updatedAt.getTime(),
          status: swap.status as SwapStatus,
        },
        stepIndex: 0,
        config: {
          VITE_UNCHAINED_THORCHAIN_HTTP_URL: process.env.VITE_UNCHAINED_THORCHAIN_HTTP_URL || '',
          VITE_UNCHAINED_MAYACHAIN_HTTP_URL: process.env.VITE_UNCHAINED_MAYACHAIN_HTTP_URL || '',
          VITE_UNCHAINED_COSMOS_HTTP_URL: process.env.VITE_UNCHAINED_COSMOS_HTTP_URL || '',
          VITE_THORCHAIN_NODE_URL: process.env.VITE_THORCHAIN_NODE_URL || '',
          VITE_MAYACHAIN_NODE_URL: process.env.VITE_MAYACHAIN_NODE_URL || '',
          VITE_COWSWAP_BASE_URL: process.env.VITE_COWSWAP_BASE_URL || '',
          VITE_CHAINFLIP_API_KEY: process.env.VITE_CHAINFLIP_API_KEY || '',
          VITE_CHAINFLIP_API_URL: process.env.VITE_CHAINFLIP_API_URL || '',
          VITE_JUPITER_API_URL: process.env.VITE_JUPITER_API_URL || '',
          VITE_RELAY_API_URL: process.env.VITE_RELAY_API_URL || '',
          VITE_PORTALS_BASE_URL: process.env.VITE_PORTALS_BASE_URL || '',
          VITE_ZRX_BASE_URL: process.env.VITE_ZRX_BASE_URL || '',
          VITE_THORCHAIN_MIDGARD_URL: process.env.VITE_THORCHAIN_MIDGARD_URL || '',
          VITE_MAYACHAIN_MIDGARD_URL: process.env.VITE_MAYACHAIN_MIDGARD_URL || '',
          VITE_UNCHAINED_BITCOIN_HTTP_URL: process.env.VITE_UNCHAINED_BITCOIN_HTTP_URL || '',
          VITE_UNCHAINED_DOGECOIN_HTTP_URL: process.env.VITE_UNCHAINED_DOGECOIN_HTTP_URL || '',
          VITE_UNCHAINED_LITECOIN_HTTP_URL: process.env.VITE_UNCHAINED_LITECOIN_HTTP_URL || '',
          VITE_UNCHAINED_BITCOINCASH_HTTP_URL: process.env.VITE_UNCHAINED_BITCOINCASH_HTTP_URL || '',
          VITE_UNCHAINED_ETHEREUM_HTTP_URL: process.env.VITE_UNCHAINED_ETHEREUM_HTTP_URL || '',
          VITE_UNCHAINED_AVALANCHE_HTTP_URL: process.env.VITE_UNCHAINED_AVALANCHE_HTTP_URL || '',
          VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL: process.env.VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL || '',
          VITE_UNCHAINED_BASE_HTTP_URL: process.env.VITE_UNCHAINED_BASE_HTTP_URL || '',
          VITE_FEATURE_THORCHAINSWAP_LONGTAIL: true,
          VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: true,
          VITE_FEATURE_CHAINFLIP_SWAP_DCA: true,
        },
        assertGetSolanaChainAdapter: (chainId: ChainId) => {
          return this.solanaChainAdapterService.assertGetSolanaChainAdapter(chainId);
        },
        assertGetUtxoChainAdapter: (chainId: ChainId) => {
          return this.utxoChainAdapterService.assertGetUtxoChainAdapter(chainId);
        },
        assertGetCosmosSdkChainAdapter: (chainId: ChainId) => {
          return this.cosmosSdkChainAdapterService.assertGetCosmosSdkChainAdapter(chainId);
        },
        assertGetEvmChainAdapter: (chainId: ChainId) => {
          return this.evmChainAdapterService.assertGetEvmChainAdapter(chainId);
        },
        fetchIsSmartContractAddressQuery: () => Promise.resolve(false),
      });

      return {
        status: status.status === 'Confirmed' ? 'SUCCESS' : 
                status.status === 'Failed' ? 'FAILED' : 'PENDING',
        sellTxHash: swap.sellTxHash,
        buyTxHash: status.buyTxHash,
        statusMessage: status.message,
      };
    } catch (error) {
      this.logger.error(`Failed to poll swap status for ${swapId}:`, error);
      return {
        status: 'PENDING',
        statusMessage: `Error polling status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
