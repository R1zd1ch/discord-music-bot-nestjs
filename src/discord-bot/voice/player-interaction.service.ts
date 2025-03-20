import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from 'src/queue/queue.service';
import { QueueProcessorService } from './queue-processor.service';
import { PlayerService } from '../player-embed/player.service';
import { SlashCommandContext } from 'necord';
import { AudioConnectionManagerService } from './audio-connection-manager.service';
import { AudioPlayerStatus } from '@discordjs/voice';
import { TrackResolverService } from './track-resolver.service';
import { QueueItem } from '@prisma/client';
import { PlaylistService } from 'src/playlist/playlist.service';
import { Client } from 'discord.js';

@Injectable()
export class PlayerInteractionService {
  private logger = new Logger(PlayerInteractionService.name);
  constructor(
    private readonly queueService: QueueService,
    private readonly queueProcessor: QueueProcessorService,
    private readonly playerService: PlayerService,
    private readonly connectionManager: AudioConnectionManagerService,
    private readonly trackResolver: TrackResolverService,
    private readonly playlistService: PlaylistService,
    private readonly client: Client,
  ) {}

  async handleControlCommand(
    guildId: string,
    [interaction]: SlashCommandContext,
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
    volume: number = 100,
  ) {
    // let needsUpdate = true;
    let needsProcessQueue = false;

    switch (action) {
      case 'prev':
        await this.queueService.prevTrack(guildId);
        needsProcessQueue = true;
        break;
      case 'resume_pause':
        this.togglePause(guildId);
        needsProcessQueue = false;
        break;
      case 'stop':
        await this.handleStop(guildId, [interaction]);
        needsProcessQueue = true;
        break;
      case 'next':
        await this.queueService.nextTrack(guildId);
        needsProcessQueue = true;
        break;
      case 'skipItem': {
        await this.queueService.nextItem(guildId);
        needsProcessQueue = true;
        break;
      }
      case 'loop':
        await this.queueService.setLoopMode(guildId);
        needsProcessQueue = true;
        break;

      case 'shuffle':
        await this.shuffleQueue(guildId);
        needsProcessQueue = true;
        break;
      case 'volume':
        this.logger.debug(`received volume in handleControlCommand: ${volume}`);
        await this.queueService.setVolume(guildId, volume);
        needsProcessQueue = true;
        break;
    }

    const player = this.connectionManager.getPlayer(guildId);
    if (!player) return;
    const wasPaused = player.state.status === AudioPlayerStatus.Paused;

    if (needsProcessQueue) {
      await this.queueProcessor.processQueue(guildId, [interaction]);
    }

    await this.updatePlayerMessage(guildId, [interaction], wasPaused);
  }
  private togglePause(guildId: string) {
    const player = this.connectionManager.getPlayer(guildId);
    if (!player) {
      this.logger.error('Player not found for pause toggle');
      return;
    }

    const wasPaused = player.state.status === AudioPlayerStatus.Paused;

    this.logger.debug(
      `Current player status: ${wasPaused ? 'Paused' : 'Playing'}`,
    );

    if (wasPaused) {
      player.unpause();
      this.logger.debug('Player unpaused');
    } else {
      player.pause();
      this.logger.debug('Player paused');
    }
  }

  private async shuffleQueue(guildId: string) {
    await this.queueService.shuffleQueue(guildId);

    const queuePlaylists =
      await this.queueService.getPlaylistsFromQueue(guildId);

    if (queuePlaylists) {
      for (const item of queuePlaylists) {
        if (item.playlist?.id) {
          await this.playlistService.shufflePlaylist(item.playlist.id);
        }
      }
    }
  }

  private async handleStop(
    guildId: string,
    [interaction]: SlashCommandContext,
  ) {
    const messageId = await this.queueService.getPlayerMessageId(guildId);
    const channelId = interaction.channelId;

    if (!messageId || !channelId) {
      await this.queueService.clearQueue(guildId);
    }

    await this.queueService.clearQueue(guildId);
  }

  private async updatePlayerMessage(
    guildId: string,
    [interaction]: SlashCommandContext,
    isPaused: boolean = false,
  ) {
    const queue = await this.queueService.getQueue(guildId);
    if (!queue) return;
    //eslint-disable-next-line
    const currentItem = queue.items[queue.currentPosition];
    const track = await this.trackResolver.resolveTrack(
      currentItem as QueueItem,
    );

    if (track) {
      await this.playerService.renderMusicMessage(
        track,
        queue,
        [interaction],
        isPaused,
      );
    }
  }
}
