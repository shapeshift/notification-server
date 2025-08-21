import { Injectable, Logger } from '@nestjs/common';
import { ChainAdapterManagerService } from '../chain-adapter-manager.service';
import * as unchained from '@shapeshiftoss/unchained-client';
import { bitcoin } from '@shapeshiftoss/chain-adapters';
import { 
  btcChainId,
  bchChainId,
  dogeChainId,
  ltcChainId,
} from '@shapeshiftoss/caip';
import { utxoChainIds, type UtxoChainAdapter } from '@shapeshiftoss/chain-adapters';
import type { ChainId } from '@shapeshiftoss/caip';
import { UtxoChainId } from '@shapeshiftoss/types';

@Injectable()
export class UtxoChainAdapterService {
  private readonly logger = new Logger(UtxoChainAdapterService.name);

  constructor(private chainAdapterManagerService: ChainAdapterManagerService) {}

  async initializeUtxoChainAdapters() {
    this.logger.log('Initializing UTXO chain adapters...');
    
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();

    try {
      // Initialize Bitcoin adapter
      await this.initializeBitcoinAdapter(chainAdapterManager);
      
      // Initialize Bitcoin Cash adapter
      await this.initializeBitcoinCashAdapter(chainAdapterManager);
      
      // Initialize Dogecoin adapter
      await this.initializeDogecoinAdapter(chainAdapterManager);
      
      // Initialize Litecoin adapter
      await this.initializeLitecoinAdapter(chainAdapterManager);

      this.logger.log('All UTXO chain adapters initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize UTXO chain adapters:', error);
      throw error;
    }
  }

  private async initializeBitcoinAdapter(chainAdapterManager: Map<string, any>) {
    const bitcoinHttp = new unchained.bitcoin.V1Api(
      new unchained.bitcoin.Configuration({
        basePath: process.env.VITE_UNCHAINED_BITCOIN_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const bitcoinWs = new unchained.ws.Client<unchained.bitcoin.Tx>(
      process.env.VITE_UNCHAINED_BITCOIN_WS_URL || 'wss://api.shapeshift.com',
    );

    const bitcoinAdapter = new bitcoin.ChainAdapter({
      providers: { http: bitcoinHttp, ws: bitcoinWs },
      coinName: 'Bitcoin',
      thorMidgardUrl: process.env.VITE_THORCHAIN_MIDGARD_URL || 'https://midgard.thorchain.info',
      mayaMidgardUrl: process.env.VITE_MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info',
    });

    chainAdapterManager.set(btcChainId, bitcoinAdapter);
    this.logger.log('Bitcoin adapter initialized');
  }

  private async initializeBitcoinCashAdapter(chainAdapterManager: Map<string, any>) {
    const bchHttp = new unchained.bitcoin.V1Api(
      new unchained.bitcoin.Configuration({
        basePath: process.env.VITE_UNCHAINED_BITCOINCASH_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const bchWs = new unchained.ws.Client<unchained.bitcoin.Tx>(
      process.env.VITE_UNCHAINED_BITCOINCASH_WS_URL || 'wss://api.shapeshift.com',
    );

    const bchAdapter = new bitcoin.ChainAdapter({
      providers: { http: bchHttp, ws: bchWs },
      coinName: 'BitcoinCash',
      thorMidgardUrl: process.env.VITE_THORCHAIN_MIDGARD_URL || 'https://midgard.thorchain.info',
      mayaMidgardUrl: process.env.VITE_MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info',
    });

    chainAdapterManager.set(bchChainId, bchAdapter);
    this.logger.log('Bitcoin Cash adapter initialized');
  }

  private async initializeDogecoinAdapter(chainAdapterManager: Map<string, any>) {
    const dogeHttp = new unchained.bitcoin.V1Api(
      new unchained.bitcoin.Configuration({
        basePath: process.env.VITE_UNCHAINED_DOGECOIN_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const dogeWs = new unchained.ws.Client<unchained.bitcoin.Tx>(
      process.env.VITE_UNCHAINED_DOGECOIN_WS_URL || 'wss://api.shapeshift.com',
    );

    const dogeAdapter = new bitcoin.ChainAdapter({
      providers: { http: dogeHttp, ws: dogeWs },
      coinName: 'Dogecoin',
      thorMidgardUrl: process.env.VITE_THORCHAIN_MIDGARD_URL || 'https://midgard.thorchain.info',
      mayaMidgardUrl: process.env.VITE_MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info',
    });

    chainAdapterManager.set(dogeChainId, dogeAdapter);
    this.logger.log('Dogecoin adapter initialized');
  }

  private async initializeLitecoinAdapter(chainAdapterManager: Map<string, any>) {
    const ltcHttp = new unchained.bitcoin.V1Api(
      new unchained.bitcoin.Configuration({
        basePath: process.env.VITE_UNCHAINED_LITECOIN_HTTP_URL || 'https://api.shapeshift.com',
      }),
    );

    const ltcWs = new unchained.ws.Client<unchained.bitcoin.Tx>(
      process.env.VITE_UNCHAINED_LITECOIN_WS_URL || 'wss://api.shapeshift.com',
    );

    const ltcAdapter = new bitcoin.ChainAdapter({
      providers: { http: ltcHttp, ws: ltcWs },
      coinName: 'Litecoin',
      thorMidgardUrl: process.env.VITE_THORCHAIN_MIDGARD_URL || 'https://midgard.thorchain.info',
      mayaMidgardUrl: process.env.VITE_MAYACHAIN_MIDGARD_URL || 'https://midgard.mayachain.info',
    });

    chainAdapterManager.set(ltcChainId, ltcAdapter);
    this.logger.log('Litecoin adapter initialized');
  }

  isUtxoChainAdapter(chainAdapter: unknown): chainAdapter is UtxoChainAdapter {
    return utxoChainIds.includes((chainAdapter as UtxoChainAdapter).getChainId() as UtxoChainId);
  }

  assertGetUtxoChainAdapter(chainId: ChainId): UtxoChainAdapter {
    const chainAdapterManager = this.chainAdapterManagerService.getChainAdapterManager();
    const adapter = chainAdapterManager.get(chainId);

    if (!this.isUtxoChainAdapter(adapter)) {
      throw Error('invalid chain adapter');
    }

    return adapter;
  }
}
