import { Injectable, Logger } from '@nestjs/common';
import { Once } from 'necord';

@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  @Once('ready') // Когда бот запустился
  onReady() {
    this.logger.log('🤖 Бот успешно запущен!');
  }
}
