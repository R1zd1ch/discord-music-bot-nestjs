import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(discordId: string) {
    return this.prisma.user.create({ data: { discordId } });
  }

  async getUser(discordId: string) {
    return this.prisma.user.findUnique({ where: { discordId } });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async delete(discordId: string) {
    return this.prisma.user.delete({ where: { discordId } });
  }
}
