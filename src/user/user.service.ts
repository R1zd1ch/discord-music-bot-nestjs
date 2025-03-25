import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 секунда

  constructor(private readonly prisma: PrismaService) {}

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(
          `Операция не удалась, повторная попытка через ${this.RETRY_DELAY}мс. Осталось попыток: ${retries - 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  async create(discordId: string) {
    return this.retryOperation(() =>
      this.prisma.user.create({
        data: {
          discordId,
          commandUsage: {},
        },
      }),
    );
  }

  async getUser(discordId: string) {
    return this.retryOperation(() =>
      this.prisma.user.findUnique({ where: { discordId } }),
    );
  }

  async findAll() {
    return this.retryOperation(() => this.prisma.user.findMany());
  }

  async delete(discordId: string) {
    return this.retryOperation(() =>
      this.prisma.user.delete({ where: { discordId } }),
    );
  }

  async updateCommandUsage(discordId: string, commandName: string) {
    return this.retryOperation(async () => {
      const user = await this.getUser(discordId);
      if (!user) return null;

      const currentUsage = (user.commandUsage as Record<string, number>) || {};
      currentUsage[commandName] = (currentUsage[commandName] || 0) + 1;

      return this.prisma.user.update({
        where: { discordId },
        data: { commandUsage: currentUsage },
      });
    });
  }
}
