import { Injectable, Logger } from '@nestjs/common';
import { ChainAdapterManagerService } from '../chain-adapter-manager.service';
import * as unchained from '@shapeshiftoss/unchained-client';
import { cosmos } from '@shapeshiftoss/chain-adapters';
import { 
  cosmosChainId,
  thorchainChainId,
  mayachainChainId,
} from '@shapeshiftoss/caip';
import { cosmosSdkChainIds, type CosmosSdkChainAdapter } from '@shapeshiftoss/chain-adapters';
import type { ChainId } from '@shapeshiftoss/caip';
import { CosmosSdkChainId } from '@shapeshiftoss/types';

@Injectable()
export class CosmosSdkChainAdapterService {
  private readonly logger = new Logger(CosmosSdkChainAdapterService.name);

  constructor(private chainAdapterManagerService: ChainAdapterManagerService) {}

  async initializeCosmosSdkChainAdapters() {
    this.logger.log('Initializing Cosmos SDK chain adapters...');
    
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();

    try {
      // Initialize Cosmos adapter
      await this.initializeCosmosAdapter(chainAdapterManager);
      
      // Initialize Thorchain adapter
      await this.initializeThorchainAdapter(chainAdapterManager);
      
      // Initialize Mayachain adapter
      await this.initializeMayachainAdapter(chainAdapterManager);

      this.logger.log('All Cosmos SDK chain adapters initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Cosmos SDK chain adapters:', error);
      throw error;
    }
  }

  private async initializeCosmosAdapter(chainAdapterManager: Map<string, any>) {
    const cosmosHttp = new unchained.cosmos.V1Api(
      new unchained.cosmos.Configuration({
        basePath: process.env.VITE_UNCHAINED_COSMOS_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const cosmosWs = new unchained.ws.Client<unchained.cosmossdk.types.Tx>(
      process.env.VITE_UNCHAINED_COSMOS_WS_URL || 'wss://api.shapeshift.com',
    );

    const cosmosAdapter = new cosmos.ChainAdapter({
      providers: { http: cosmosHttp, ws: cosmosWs },
      midgardUrl: process.env.VITE_COSMOS_MIDGARD_URL || 'https://midgard.cosmos.info',
      coinName: 'Cosmos',
    });

    chainAdapterManager.set(cosmosChainId, cosmosAdapter);
    this.logger.log('Cosmos adapter initialized');
  }

  private async initializeThorchainAdapter(chainAdapterManager: Map<string, any>) {
    const thorchainHttp = new unchained.cosmos.V1Api(
      new unchained.cosmos.Configuration({
        basePath: process.env.VITE_UNCHAINED_THORCHAIN_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const thorchainWs = new unchained.ws.Client<unchained.cosmossdk.types.Tx>(
      process.env.VITE_UNCHAINED_THORCHAIN_WS_URL || 'wss://api.shapeshift.com',
    );

    const thorchainAdapter = new cosmos.ChainAdapter({
      providers: { http: thorchainHttp, ws: thorchainWs },
      midgardUrl: process.env.VITE_THORCHAIN_MIDGARD_URL || 'https://midgard.thorchain.info',
      coinName: 'Thorchain',
    });

    chainAdapterManager.set(thorchainChainId, thorchainAdapter);
    this.logger.log('Thorchain adapter initialized');
  }

  private async initializeMayachainAdapter(chainAdapterManager: Map<string, any>) {
    const mayachainHttp = new unchained.cosmos.V1Api(
      new unchained.cosmos.Configuration({
        basePath: process.env.VITE_UNCHAINED_MAYACHAIN_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const mayachainWs = new unchained.ws.Client<unchained.cosmossdk.types.Tx>(
      process.env.VITE_UNCHAINED_MAYACHAIN_WS_URL || 'wss://api.shapeshift.com',
    );

    const mayachainAdapter = new cosmos.ChainAdapter({
      providers: { http: mayachainHttp, ws: mayachainWs },
      midgardUrl: process.env.VITE_MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info',
      coinName: 'Mayachain',
    });

    chainAdapterManager.set(mayachainChainId, mayachainAdapter);
    this.logger.log('Mayachain adapter initialized');
  }

  isCosmosSdkChainAdapter(chainAdapter: unknown): chainAdapter is CosmosSdkChainAdapter {
    return cosmosSdkChainIds.includes(
      (chainAdapter as CosmosSdkChainAdapter).getChainId() as CosmosSdkChainId,
    );
  }

  assertGetCosmosSdkChainAdapter(chainId: ChainId): CosmosSdkChainAdapter {
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();
    const adapter = chainAdapterManager.get(chainId);

    if (!this.isCosmosSdkChainAdapter(adapter)) {
      throw Error('invalid chain adapter');
    }

    return adapter;
  }
}
