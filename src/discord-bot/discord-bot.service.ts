import { Injectable, Logger } from '@nestjs/common';
import { Once } from 'necord';

import { Client } from 'discord.js';

import { CommandHandlerService } from './bot-handlers/command-handler.service';
import { EventHandlerService } from './bot-handlers/event-handler.service';
import { ButtonHandlerService } from './bot-handlers/button-handler.service';

@Injectable()
export class DiscordBotService {
  constructor(
    private readonly client: Client,
    private readonly commandService: CommandHandlerService,
    private readonly eventService: EventHandlerService,
    private readonly buttonService: ButtonHandlerService,
  ) {}
  private readonly logger = new Logger(DiscordBotService.name);
  private readonly TIMEOUT = 1 * 60 * 1000;

  @Once('ready') // Когда бот запустился
  onReady() {
    this.logger.log('🤖 Бот успешно запущен!');
  }
}
