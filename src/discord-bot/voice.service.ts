import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  entersState,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  generateDependencyReport,
} from '@discordjs/voice';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { SlashCommandContext } from 'necord';
import { QueueService } from 'src/queue/queue.service';
import { UserService } from 'src/user/user.service';
import { PlaylistService } from 'src/playlist/playlist.service';
import { LoopMode, QueueItem, QueueItemType, Track } from '@prisma/client';
import { TrackService } from 'src/track/track.service';
import { PlayerService } from './music-embed/player.service';

@Injectable()
export class VoiceService {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private logger = new Logger(VoiceService.name);

  constructor(
    private readonly yandexMusicService: YandexMusicService,
    private readonly queueService: QueueService,
    private readonly userService: UserService,
    private readonly trackService: TrackService,
    private readonly playlistService: PlaylistService,
    private readonly renderPlayerService: PlayerService,
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
    this.logger.log(`Joining voice channel ${channelId} in guild ${guildId}`);
    this.logger.debug(generateDependencyReport());
    await this.ensureVoiceConnection(guildId, channelId, adapterCreator);

    const response = await this.yandexMusicService.searchYM(url);

    if (
      !response ||
      !Array.isArray(response.tracks) ||
      response.tracks.length === 0
    ) {
      return 'Плейлист или трек не найдены';
    }
    const trackIds = response.tracks.map((track: Track) => track.trackId);

    let message: any;

    if (response.tracks.length > 1) {
      if ('playlistName' in response && response.playlistName && userId) {
        await this.handlePlaylist(guildId, userId, response);
      } else {
        await this.handleTracks(guildId, trackIds);
      }
    } else if (response.tracks.length === 1) {
      this.logger.log(`Only one track found ${trackIds[0]}`);

      await this.handleTrack(guildId, trackIds[0]);
    }
    this.logger.log('Track added to queue');

    await this.ensurePlaybackStarted(guildId, [interaction]);

    this.logger.log('Playback started');

    //eslint-disable-next-line
    message = await interaction.followUp({
      content: 'Плейлист или трек добавлен в очередь',
    });
    //eslint-disable-next-line
    setTimeout(() => void message.delete(), 2000);
  }

  private async proccesQueue(
    guildId: string,
    [interaction]: SlashCommandContext,
  ) {
    this.logger.log(`Processing queue for guild ${guildId}`);
    try {
      const player = this.players.get(guildId);

      if (!player) return;
      const queue = await this.queueService.getQueue(guildId);

      this.logger.log(`queue tracks ${queue?.items?.length}`);

      if (!queue?.items?.length || queue.items.length === 0) {
        this.cleanup(guildId);
        return;
      }

      const currentItem = queue.items[0];
      const track = await this.resolveTrack(currentItem);
      if (!track || track instanceof NotFoundException) {
        await this.skipProblematicTrack(guildId);
        void (await this.proccesQueue(guildId, [interaction]));
        return;
      }

      const filepathOfTrack = await this.downloadTrack(track.trackId);
      this.logger.log(`Track downloaded at ${filepathOfTrack}`);
      const resource = createAudioResource(filepathOfTrack);
      player.play(resource);

      if (track)
        await this.renderPlayerService.renderMusicMessage(track, queue, [
          interaction,
        ]);

      player.removeAllListeners(AudioPlayerStatus.Idle);

      player.once(AudioPlayerStatus.Idle, () => {
        fs.unlink(filepathOfTrack, (err) => err && console.error(err));

        void (async () => {
          if (queue.loopMode === LoopMode.TRACK) {
            // todo: repeat mode on queueservice
            await Promise.resolve();
          } else {
            await this.queueService.nextTrack(guildId);
          }

          await this.proccesQueue(guildId, [interaction]);
        })();
      });
    } catch (e) {
      this.cleanup(guildId);
      this.logger.error(`Error processing queue: ${e}`);
    }
  }

  private async ensureVoiceConnection(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
  ) {
    if (!this.connections.has(guildId)) {
      const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
      });

      await this.queueService.clearQueue(guildId);

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        connection.destroy();
        return '❌ Не удалось подключиться к голосовому каналу';
      }
      this.connections.set(guildId, connection);
    }
  }

  private async handlePlaylist(
    guildId: string,
    userId: string,
    searchResult: any,
  ) {
    //eslint-disable-next-line
    const trackIds = searchResult.tracks.map(
      (t: Track) => t.trackId,
    ) as string[];
    //eslint-disable-next-line
    const playlistName = searchResult.playlistName as string;
    const existingPlaylist = await this.playlistService.findByName(
      userId,
      playlistName,
    );

    if (existingPlaylist) {
      await this.playlistService.addTracksToPlaylist(
        existingPlaylist.id,
        trackIds,
      );
      await this.queueService.addPlaylistToQueue(guildId, existingPlaylist.id);
      return;
    }

    this.logger.log(`userId: ${userId}, playlistName: ${playlistName}`);

    const newPlayList = await this.playlistService.createPlaylist(
      userId,
      playlistName,
    );

    await this.playlistService.addTracksToPlaylist(newPlayList.id, trackIds);

    await this.queueService.addPlaylistToQueue(guildId, newPlayList.id);
  }

  private async handleTracks(guildId: string, trackIds: string[]) {
    await this.queueService.addTracksToQueue(guildId, trackIds);
  }

  private async handleTrack(guildId: string, trackId: string) {
    await this.queueService.addTrackToQueue(guildId, trackId);
  }

  private async ensurePlaybackStarted(
    guildId: string,
    [interaction]: SlashCommandContext,
  ) {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer();
      this.players.set(guildId, player);
      this.connections.get(guildId)?.subscribe(player);
      await this.proccesQueue(guildId, [interaction]);
    } else {
      const player = this.players.get(guildId);
      if (player?.state.status === AudioPlayerStatus.Idle) {
        //todo
      }
    }
  }

  private async resolveTrack(item: QueueItem) {
    if (item.type === QueueItemType.TRACK && item.trackId) {
      this.logger.log(`Resolving track ${item.trackId}`);
      return await this.trackService.getTrack(item.trackId);
    }

    if (item.type === QueueItemType.PLAYLIST && item.playlistId) {
      const playlist = await this.playlistService.getTracksFromPlaylist(
        item.playlistId,
      );
      this.logger.log(`${playlist[0].id} ${item.currentIndex}`);

      if (item.currentIndex < playlist.length) {
        const track = playlist[item.currentIndex];

        return track.track;
      }
    }

    return null;
  }

  private async downloadTrack(trackId: string): Promise<string> {
    const maxRetries = 10; //todo вынести в константы
    let retries = 0;
    const dirPath = path.join(__dirname, '..', 'temp');

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    while (retries < maxRetries) {
      try {
        const url = await this.yandexMusicService.getTrackSourceYM(trackId);
        if (!url || !url.source) {
          throw new Error('Invalid track source received');
        }
        const source = url.source;
        const filepath = path.join(dirPath, `${Date.now()}-${trackId}.mp3`);
        this.logger.log(`Download track ${retries + 1}`);
        const response = await axios.get(source, {
          responseType: 'arraybuffer',
          timeout: 30000,
          validateStatus: (status) => status === 200,
        });

        const buffer = Buffer.from(response.data);

        await fs.promises.writeFile(filepath, buffer);

        return filepath;
      } catch (e) {
        retries++;
        this.logger.error(`Download error retries ${retries}, ${e || ''}`);

        if (retries === maxRetries)
          throw new Error(
            `Failed  to downloadTrack after ${maxRetries} attempts`,
          );

        const delay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }

    throw new Error(`Unexpected Error in downloadTrack`);
  }

  private async skipProblematicTrack(guildId: string) {
    try {
      await this.queueService.nextTrack(guildId);
    } catch (e) {
      this.logger.error(`Failed to skip problematic track: ${e}`);
    }
  }
  private async updateMusicMessage(
    guildId: string,
    [interaction]: SlashCommandContext,
    isPaused: boolean = false,
  ) {
    const queue = await this.queueService.getQueue(guildId);
    if (!queue || queue.items.length === 0) return;
    const currentItem = queue.items[0];

    const track = await this.resolveTrack(currentItem);
    if (!track || track instanceof NotFoundException) return;

    this.logger.log(`Updating music message for guild ${guildId}`);
    await this.renderPlayerService.renderMusicMessage(
      track,
      queue,
      [interaction],
      isPaused,
    );

    return;
  }

  cleanup(guildId: string) {
    this.players.get(guildId)?.stop();
    this.connections.get(guildId)?.destroy();
    this.players.delete(guildId);
    this.connections.delete(guildId);
  }

  public async prevTrack(guildId: string, [interaction]: SlashCommandContext) {
    await this.queueService.prevTrack(guildId).finally(() => {
      this.proccesQueue(guildId, [interaction]);
    });

    await this.updateMusicMessage(guildId, [interaction]);
  }

  public async nextTrack(guildId: string, [interaction]: SlashCommandContext) {
    await this.queueService.nextTrack(guildId).finally(() => {
      this.proccesQueue(guildId, [interaction]);
    });

    await this.updateMusicMessage(guildId, [interaction]);
  }

  public async togglePause(
    guildId: string,
    [interaction]: SlashCommandContext,
  ) {
    const player = this.getPlayer(guildId);
    if (!player) return;

    const wasPaused = player.state.status === AudioPlayerStatus.Paused;

    if (wasPaused) {
      player.unpause();
    } else {
      player.pause();
    }

    await this.updateMusicMessage(guildId, [interaction], !wasPaused);
  }

  public async stop(guildId: string, [interaction]: SlashCommandContext) {
    this.cleanup(guildId);
    await Promise.resolve();
  }

  public getConnection(guildId: string) {
    return this.connections.get(guildId);
  }

  public getPlayer(guildId: string) {
    return this.players.get(guildId);
  }
}
