import { Injectable, Logger } from '@nestjs/common';
import { AudioConnectionManagerService } from './audio-connection-manager.service';
import { QueueProcessorService } from './queue-processor.service';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import { PlayerInteractionService } from './player-interaction.service';
import { QueueManagerService } from './queue-manager.service';
import { SlashCommandContext } from 'necord';
import { DiscordGatewayAdapterCreator } from '@discordjs/voice';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly connectionManager: AudioConnectionManagerService,
    private readonly queueProcessor: QueueProcessorService,
    private readonly queueManager: QueueManagerService,
    private readonly interactionService: PlayerInteractionService,
    private readonly yandexMusicService: YandexMusicService,
  ) {}

  async playAudio(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
    userId: string,
    url: string,
    [interaction]: SlashCommandContext,
  ) {
    await interaction.deferReply();

    try {
      await this.connectionManager.createConnection(
        guildId,
        channelId,
        adapterCreator,
      );
      const result = await this.yandexMusicService.searchYM(url);

      if (!result) {
        await interaction.editReply('Ничего не нашел');
        return;
      }

      await this.queueManager.handleSearchResult(
        guildId,
        userId,
        {
          tracks: result.tracks,
          playlistName:
            'playlistName' in result &&
            typeof result.playlistName === 'string' &&
            result.playlistName
              ? result.playlistName
              : undefined,
        },
        [interaction],
      );
      await this.queueProcessor.processQueue(guildId, [interaction]);

      await this.sendSuccessResponse([interaction]);
    } catch (error: unknown) {
      await this.handleError(error, [interaction], guildId);
    }
  }

  public async handleControl(
    guildId: string,
    action:
      | 'next'
      | 'prev'
      | 'resume_pause'
      | 'stop'
      | 'loop'
      | 'shuffle'
      | 'queue'
      | 'help'
      | 'volume'
      | 'skipItem',
    context: SlashCommandContext,
    volume: number = 100,
  ) {
    this.logger.debug(`setting volume: ${volume} in handleControl`);
    await this.interactionService.handleControlCommand(
      guildId,
      context,
      action,
      volume,
    );
  }

  private async sendSuccessResponse([interaction]: SlashCommandContext) {
    const message = await interaction.followUp({
      content: '✅ Успешно добавлено в очередь',
      fetchReply: true,
    });

    setTimeout(() => {
      message.delete().catch(() => {});
    }, 2000);
  }

  private async handleError(
    error: any,
    [interaction]: SlashCommandContext,
    guildId: string,
  ) {
    this.connectionManager.cleanupConnections(guildId);
    await interaction.followUp({
      //eslint-disable-next-line
      content: `❌ Ошибка: ${error?.message ? error?.message : error}`,
      ephemeral: true,
    });
  }
}
