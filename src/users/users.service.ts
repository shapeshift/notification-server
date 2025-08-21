import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface CreateUserDto {
  accountIds: string[];
}

export interface AddAccountIdDto {
  userId: string;
  accountId: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  private hashAccountId(accountId: string): string {
    const salt = process.env.ACCOUNT_ID_SALT || 'default-salt-change-in-production';
    return crypto.createHash('sha256').update(accountId + salt).digest('hex');
  }

  private async findUserByHashedAccountId(hashedAccountId: string) {
    return this.prisma.user.findFirst({
      where: {
        userAccounts: {
          some: {
            accountId: hashedAccountId,
          },
        },
      },
      include: {
        userAccounts: true,
        devices: true,
      },
    });
  }

  async createUser(data: CreateUserDto) {
    try {
      const hashedAccountIds = data.accountIds.map(id => this.hashAccountId(id));
      
      for (const hashedAccountId of hashedAccountIds) {
        const existingUser = await this.findUserByHashedAccountId(hashedAccountId);
        if (existingUser) {
          this.logger.log(`User already exists with account ID: ${existingUser.id}`);
          
          const newAccountIds = hashedAccountIds.filter(id => 
            !existingUser.userAccounts.some(ua => ua.accountId === id)
          );
          
          if (newAccountIds.length > 0) {
            await this.addHashedAccountIds(existingUser.id, newAccountIds);
          }
          
          return this.getUserById(existingUser.id);
        }
      }

      const user = await this.prisma.user.create({
        data: {
          userAccounts: {
            create: hashedAccountIds.map(id => ({ 
              accountId: id,
            })),
          },
        },
      });

      if (hashedAccountIds.length > 0) {
        await this.addHashedAccountIds(user.id, hashedAccountIds);
      }

      this.logger.log(`Created new user: ${user.id} with ${hashedAccountIds.length} account IDs`);
      return this.getUserById(user.id);
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async addAccountIds(userId: string, accountIds: string[]) {
    try {
      const hashedAccountIds = accountIds.map(id => this.hashAccountId(id));
      return this.addHashedAccountIds(userId, hashedAccountIds);
    } catch (error) {
      this.logger.error('Failed to add account IDs', error);
      throw error;
    }
  }

  private async addHashedAccountIds(userId: string, hashedAccountIds: string[]) {
    try {
      const userAccounts = await Promise.all(
        hashedAccountIds.map(hashedAccountId =>
          this.prisma.userAccount.upsert({
            where: {
              userId_accountId: {
                userId,
                accountId: hashedAccountId,
              },
            },
            update: {},
            create: {
              userId,
              accountId: hashedAccountId,
            },
          })
        )
      );

      this.logger.log(`Added ${userAccounts.length} account IDs for user ${userId}`);
      return userAccounts;
    } catch (error) {
      this.logger.error('Failed to add hashed account IDs', error);
      throw error;
    }
  }

  async addAccountId(data: AddAccountIdDto) {
    try {
      const hashedAccountId = this.hashAccountId(data.accountId);
      
      const existingUser = await this.findUserByHashedAccountId(hashedAccountId);
      if (existingUser && existingUser.id !== data.userId) {
        throw new Error(`Account ID already belongs to user ${existingUser.id}`);
      }

      const userAccount = await this.prisma.userAccount.upsert({
        where: {
          userId_accountId: {
            userId: data.userId,
            accountId: hashedAccountId,
          },
        },
        update: {},
        create: {
          userId: data.userId,
          accountId: hashedAccountId,
        },
      });

      this.logger.log(`Added account ID for user ${data.userId}`);
      return userAccount;
    } catch (error) {
      this.logger.error('Failed to add account ID', error);
      throw error;
    }
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userAccounts: true,
        devices: true,
        swaps: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getUserByAccountId(accountId: string) {
    const hashedAccountId = this.hashAccountId(accountId);
    
    return this.prisma.user.findFirst({
      where: {
        userAccounts: {
          some: {
            accountId: hashedAccountId,
          },
        },
      },
      include: {
        userAccounts: true,
        devices: true,
        swaps: {
          where: {
            OR: [
              { sellAccountId: hashedAccountId },
              { buyAccountId: hashedAccountId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAllUsers(limit = 50) {
    return this.prisma.user.findMany({
      take: limit,
      include: {
        userAccounts: true,
        devices: {
          where: { isActive: true },
        },
        _count: {
          select: {
            swaps: true,
            notifications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAccountId(userId: string, accountId: string) {
    try {
      const hashedAccountId = this.hashAccountId(accountId);
      
      await this.prisma.userAccount.delete({
        where: {
          userId_accountId: {
            userId,
            accountId: hashedAccountId,
          },
        },
      });

      this.logger.log(`Removed account ID for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to remove account ID', error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });

      this.logger.log(`Deleted user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw error;
    }
  }

  async processAccountIds(userId: string, rawAccountIds: string[]) {
    const hashedAccountIds = rawAccountIds.map(id => this.hashAccountId(id));
    return this.addHashedAccountIds(userId, hashedAccountIds);
  }

  async userExistsWithAccountId(accountId: string): Promise<boolean> {
    const hashedAccountId = this.hashAccountId(accountId);
    const user = await this.findUserByHashedAccountId(hashedAccountId);
    return !!user;
  }

  async getOrCreateUserByAccountId(accountId: string) {
    const hashedAccountId = this.hashAccountId(accountId);
    const existingUser = await this.findUserByHashedAccountId(hashedAccountId);
    
    if (existingUser) {
      this.logger.log(`Found existing user: ${existingUser.id} for account ID`);
      return existingUser;
    }

    return this.createUser({
      accountIds: [accountId],
    });
  }

  async getOrCreateUserByAccountIds(accountIds: string[]) {
    this.logger.log(`getOrCreateUserByAccountIds called with accountIds: ${JSON.stringify(accountIds)}`);
    
    if (!accountIds || accountIds.length === 0) {
      throw new Error('At least one account ID is required');
    }

    const hashedAccountIds = accountIds.map(id => this.hashAccountId(id));
    this.logger.log(`Hashed account IDs: ${JSON.stringify(hashedAccountIds)}`);
    
    for (const hashedAccountId of hashedAccountIds) {
      const existingUser = await this.findUserByHashedAccountId(hashedAccountId);
      if (existingUser) {
        this.logger.log(`Found existing user: ${existingUser.id} for account ID`);
        
        const newAccountIds = hashedAccountIds.filter(id => 
          !existingUser.userAccounts.some(ua => ua.accountId === id)
        );
        
        if (newAccountIds.length > 0) {
          await this.addHashedAccountIds(existingUser.id, newAccountIds);
        }
        
        const result = await this.getUserById(existingUser.id);
        this.logger.log(`Returning existing user: ${result.id}`);
        return result;
      }
    }

    this.logger.log(`No existing user found, creating new user with ${hashedAccountIds.length} account IDs`);
    const user = await this.prisma.user.create({
      data: {
        userAccounts: {
          create: hashedAccountIds.map(id => ({ 
            accountId: id,
          })),
        },
      },
    });

    this.logger.log(`Created new user: ${user.id} with ${hashedAccountIds.length} account IDs`);
    const result = await this.getUserById(user.id);
    this.logger.log(`Returning new user: ${result.id}`);
    return result;
  }
}
