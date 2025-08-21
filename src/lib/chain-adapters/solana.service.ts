import { Injectable, Logger } from '@nestjs/common';
import { ChainAdapterManagerService } from '../chain-adapter-manager.service';
import * as unchained from '@shapeshiftoss/unchained-client';
import { solana } from '@shapeshiftoss/chain-adapters';
import { solanaChainId } from '@shapeshiftoss/caip';
import type { ChainId } from '@shapeshiftoss/caip';

@Injectable()
export class SolanaChainAdapterService {
  private readonly logger = new Logger(SolanaChainAdapterService.name);

  constructor(private chainAdapterManagerService: ChainAdapterManagerService) {}

  async initializeSolanaChainAdapter() {
    this.logger.log('Initializing Solana chain adapter...');
    
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();

    try {
      await this.initializeSolanaAdapter(chainAdapterManager);
      this.logger.log('Solana chain adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Solana chain adapter:', error);
      throw error;
    }
  }

  private async initializeSolanaAdapter(chainAdapterManager: Map<string, any>) {
    const solanaHttp = new unchained.solana.V1Api(
      new unchained.solana.Configuration({
        basePath: process.env.VITE_UNCHAINED_SOLANA_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const solanaWs = new unchained.ws.Client<unchained.solana.Tx>(
      process.env.VITE_UNCHAINED_SOLANA_WS_URL || 'wss://api.shapeshift.com',
    );

    const solanaAdapter = new solana.ChainAdapter({
      providers: { http: solanaHttp, ws: solanaWs },
      rpcUrl: process.env.VITE_SOLANA_RPC_URL || 'https://api.shapeshift.com',
    });

    chainAdapterManager.set(solanaChainId, solanaAdapter);
    this.logger.log('Solana adapter initialized');
  }

  isSolanaChainAdapter(chainAdapter: unknown): chainAdapter is solana.ChainAdapter {
    return (chainAdapter as solana.ChainAdapter).getChainId() === solanaChainId;
  }

  assertGetSolanaChainAdapter(chainId: ChainId): solana.ChainAdapter {
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();
    const adapter = chainAdapterManager.get(chainId);

    if (!this.isSolanaChainAdapter(adapter)) {
      throw Error('invalid chain adapter');
    }

    return adapter;
  }
}
