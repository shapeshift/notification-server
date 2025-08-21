import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';
import { SwapsService } from './swaps/swaps.service';
import { SwapsController } from './swaps/swaps.controller';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { SwapPollingService } from './polling/swap-polling.service';
import { ChainAdapterInitService } from './lib/chain-adapter-init.service';
import { ChainAdapterManagerService } from './lib/chain-adapter-manager.service';
import { EvmChainAdapterService } from './lib/chain-adapters/evm.service';
import { UtxoChainAdapterService } from './lib/chain-adapters/utxo.service';
import { CosmosSdkChainAdapterService } from './lib/chain-adapters/cosmos-sdk.service';
import { SolanaChainAdapterService } from './lib/chain-adapters/solana.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    NotificationsController,
    SwapsController,
    UsersController,
  ],
  providers: [
    AppService,
    PrismaService,
    NotificationsService,
    SwapsService,
    UsersService,
    WebsocketGateway,
    SwapPollingService,
    ChainAdapterInitService,
    ChainAdapterManagerService,
    EvmChainAdapterService,
    UtxoChainAdapterService,
    CosmosSdkChainAdapterService,
    SolanaChainAdapterService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly chainAdapterInitService: ChainAdapterInitService) {}

  async onModuleInit() {
    // Initialize chain adapters when the app starts
    await this.chainAdapterInitService.initializeChainAdapters();
  }
}
