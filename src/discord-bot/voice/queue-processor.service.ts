import { Injectable, Logger } from '@nestjs/common';
import { AudioConnectionManagerService } from './audio-connection-manager.service';
import { QueueService } from 'src/queue/queue.service';
import { TrackResolverService } from './track-resolver.service';
import { PlayerService } from '../player/player.service';
import { TrackCacheService } from './track-cache.service';
import { SlashCommandContext } from 'necord';
import { LoopMode, Queue, QueueItem, Track } from '@prisma/client';
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioResource,
  StreamType,
} from '@discordjs/voice';

@Injectable()
export class QueueProcessorService {
  private logger = new Logger(QueueProcessorService.name);

  constructor(
    private readonly connectionManager: AudioConnectionManagerService,
    private readonly queueService: QueueService,
    private readonly trackResolver: TrackResolverService,
    private readonly playerService: PlayerService,
    private readonly trackCache: TrackCacheService,
  ) {}

  async processQueue(guildId: string, [interaction]: SlashCommandContext) {
    const player = this.connectionManager.getPlayer(guildId);
    if (!player) return;

    const queue = await this.queueService.getQueue(guildId);
    //eslint-disable-next-line
    if (!queue?.items.length) {
      this.connectionManager.cleanupConnections(guildId);
      return;
    }
    //eslint-disable-next-line
    const currentItem = queue.items[queue.currentPosition];
    const track = await this.trackResolver.resolveTrack(
      currentItem as QueueItem,
    );

    if (!track) {
      await this.handleInvalidTrack(guildId, [interaction]);
      return;
    }

    await this.playTrack(player, track, queue, [interaction]);
    this.setupIdleHandler(
      player,
      guildId,
      [interaction],
      track,
      queue.loopMode,
    );
  }

  private async playTrack(
    player: AudioPlayer,
    track: Track,
    queue: Queue,
    [interaction]: SlashCommandContext,
  ) {
    const filePath = await this.trackCache.getTrackPath(track.trackId);
    const volume = queue?.volume ?? 100;

    const resource = createAudioResource(filePath, {
      inlineVolume: true,
      inputType: StreamType.Arbitrary,
    });

    resource.volume?.setVolumeLogarithmic(volume / 100);

    player.play(resource);

    await this.playerService.renderMusicMessage(track, queue, [interaction]);
  }

  private setupIdleHandler(
    player: AudioPlayer,
    guildId: string,
    [interaction]: SlashCommandContext,
    currentTrack: Track,
    loopMode: LoopMode,
  ) {
    player.removeAllListeners(AudioPlayerStatus.Idle);
    player.once(AudioPlayerStatus.Idle, () => {
      void (async () => {
        this.logger.log('to new track');

        if (loopMode === LoopMode.NONE) {
          await this.handleNextTrack(guildId, [interaction]);
          this.trackCache.cleanupTrack(currentTrack.trackId);
          return;
        }

        await this.handleLoopMode(guildId, [interaction]);
      })();
    });
  }

  private async handleNextTrack(
    guildId: string,
    interaction: SlashCommandContext,
  ) {
    await this.queueService.nextTrack(guildId);
    await this.processQueue(guildId, interaction);
  }

  private async handleLoopMode(
    guildId: string,
    interaction: SlashCommandContext,
  ) {
    await this.processQueue(guildId, interaction);
  }

  private async handleInvalidTrack(
    guildId: string,
    interaction: SlashCommandContext,
  ) {
    await this.queueService.nextTrack(guildId);
    await this.processQueue(guildId, interaction);
  }
}
