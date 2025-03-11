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
} from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Track } from 'yandex-music-client';
import { ButtonContext, SlashCommandContext } from 'necord';
import { PlayerRendererService } from './music-embed/player-renderer.service';

@Injectable()
export class VoiceService {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private queues: Map<string, Track[]> = new Map();
  private currentTracks: Map<string, Track | null> = new Map();
  private repeatMode: Map<string, boolean> = new Map();
  private repeatQueueMode: Map<string, boolean> = new Map();

  constructor(
    private readonly yandexMusicService: YandexMusicService,
    private readonly playerRenderer: PlayerRendererService,
  ) {}

  async playAudio(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
    url: string,
    [interaction]: SlashCommandContext,
  ) {
    const key = guildId;

    if (!this.connections.has(key)) {
      const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        connection.destroy();
        return '❌ Не удалось подключиться к голосовому каналу';
      }

      this.connections.set(key, connection);
    }

    const connection = this.connections.get(key);
    const response = await this.yandexMusicService.searchYM(url);

    if (!response) return 'Ошибка';

    const queue = this.queues.get(key) || [];

    if (response.length > 1) {
      queue.push(...(response as Track[]));
    } else if (response.length === 1) {
      queue.push(response[0] as Track);
    }

    this.queues.set(key, queue);

    if (!this.players.has(key)) {
      const player = createAudioPlayer();
      this.players.set(key, player);
      connection?.subscribe(player);
      this.processQueue(key, [interaction]);
    } else {
      const player = this.players.get(key);
      if (player?.state.status === AudioPlayerStatus.Idle) {
        this.processQueue(key, [interaction]); // Запуск нового трека, если плеер простаивает
      }
    }
    console.log(queue.length);
    await interaction.followUp({ content: 'Добавлено', ephemeral: true });
    return;
  }

  async togglePause(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();

    const key = guildId;
    const player = this.players.get(key);

    console.log(key);

    if (!player)
      return await interaction.editReply({
        content: '❌ Не удалось получить плеер\n Попробуйте перезапустить бота',
        components: [],
        embeds: [],
      });

    const isPaused = player.state.status === AudioPlayerStatus.Paused;

    if (!isPaused) {
      player.pause();
    } else player.unpause();

    // Используем рендерер для отображения состояния плеера
    const currentTrack = this.currentTracks.get(key);
    const queue = this.queues.get(key) || [];
    const nextTrack = queue.length > 0 ? queue[0].title : undefined;
    
    if (currentTrack) {
      await interaction.editReply({
        ...this.playerRenderer.renderPlayer(
          currentTrack as any,
          currentTrack,
          queue.length,
          nextTrack,
          !isPaused
        )
      });
    } else {
      await interaction.editReply({
        content: isPaused ? '▶️ Воспроизводится' : '⏸️ Пауза',
        components: [],
        embeds: [],
      });
    }
  }

  async skip(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const key = guildId;
    const player = this.players.get(key);
    if (!player) return;

    const queue = this.queues.get(key) || [];
    console.log(queue.length);
    if (queue.length > 0) {
      player.stop();
    }

    await interaction.followUp({
      content: '⏭️ Трек пропущен',
      ephemeral: true,
    });
  }

  async skipAll(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const key = guildId;
    const player = this.players.get(key);
    if (!player) return;
    player.stop();

    if (!this.queues.has(key)) return;
    this.queues.set(key, []);

    await interaction.followUp({
      content: '⏭️ Все треки пропущены',
      ephemeral: true,
    });
  }

  async shuffle(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const queue = this.queues.get(guildId);
    if (!queue || queue.length < 2) return;
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    this.queues.set(guildId, queue);
    
    // Используем рендерер для отображения статуса перемешивания
    await interaction.editReply(this.playerRenderer.renderShuffleStatus());
  }

  async repeat(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const currentMode = this.repeatMode.get(guildId) || false;
    this.repeatMode.set(guildId, !currentMode);
    
    // Используем рендерер для отображения статуса повтора
    await interaction.editReply(
      this.playerRenderer.renderRepeatStatus(!currentMode)
    );
  }

  async queue(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const queue = this.queues.get(guildId) || [];
    
    // Используем рендерер для отображения очереди
    await interaction.editReply(this.playerRenderer.renderQueue(queue));
  }

  async processQueue(
    key: string,
    [interaction]: [SlashCommandContext[0] | ButtonContext[0]],
  ) {
    const player = this.players.get(key);
    console.log(key);

    if (!player) return;

    const queue = this.queues.get(key) || [];
    if (queue.length === 0) {
      this.currentTracks.set(key, null);
      console.log('⏹️ Очередь закончилась. Ожидание новых треков.');

      const player = this.players.get(key);
      if (player?.state.status === AudioPlayerStatus.Idle) {
        console.log(
          '🔄 Ожидание новых треков... Если добавят, плеер перезапустится.',
        );
      }
      return;
    }

    const checkLength = queue.length;

    const queueTrack = queue.shift()!;
    const track = await this.yandexMusicService.makeResponse(queueTrack);
    this.currentTracks.set(key, track as any);
    this.queues.set(key, queue);
    console.log(`▶️ Воспроизводится: ${track.title}`);

    const filePath = await this.downloadTrack(track.source as string);
    track.filePath = filePath;
    const resource = createAudioResource(filePath);
    player.play(resource);

    const totalTracks = this.queues.get(key)?.length;
    const nextTrack =
      totalTracks && totalTracks > 0 ? this.queues.get(key)![0].title : '';

    if (interaction && checkLength !== 0) {
      // Используем рендерер для отображения плеера
      await interaction.editReply(
        this.playerRenderer.renderPlayer(
          track,
          queueTrack,
          totalTracks || 0,
          nextTrack || ''
        )
      );
    }

    player.once(AudioPlayerStatus.Idle, () => {
      fs.unlink(filePath, (err) => err && console.error(err));

      if (this.repeatMode.get(key)) {
        queue.unshift(queueTrack);
      }

      void this.processQueue(key, [interaction]);
    });
  }

  private async downloadTrack(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const dirPath = path.join(__dirname, '..', 'downloads');
      const filePath = path.join(dirPath, `${Date.now()}.mp3`);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      throw new Error('Ошибка загрузки аудио');
    }
  }
}rStatus,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  entersState,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Track } from 'yandex-music-client';
import { ButtonContext, SlashCommandContext } from 'necord';
import { PlayerRendererService } from './music-embed/player-renderer.service';

@Injectable()
export class VoiceService {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private queues: Map<string, Track[]> = new Map();
  private currentTracks: Map<string, Track | null> = new Map();
  private repeatMode: Map<string, boolean> = new Map();
  private repeatQueueMode: Map<string, boolean> = new Map();

  constructor(
    private readonly yandexMusicService: YandexMusicService,
    private readonly playerRenderer: PlayerRendererService,
  ) {}

  async playAudio(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
    url: string,
    [interaction]: SlashCommandContext,
  ) {
    const key = guildId;

    if (!this.connections.has(key)) {
      const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        connection.destroy();
        return '❌ Не удалось подключиться к голосовому каналу';
      }

      this.connections.set(key, connection);
    }

    const connection = this.connections.get(key);
    const response = await this.yandexMusicService.searchYM(url);

    if (!response) return 'Ошибка';

    const queue = this.queues.get(key) || [];

    if (response.length > 1) {
      queue.push(...(response as Track[]));
    } else if (response.length === 1) {
      queue.push(response[0] as Track);
    }

    this.queues.set(key, queue);

    if (!this.players.has(key)) {
      const player = createAudioPlayer();
      this.players.set(key, player);
      connection?.subscribe(player);
      this.processQueue(key, [interaction]);
    } else {
      const player = this.players.get(key);
      if (player?.state.status === AudioPlayerStatus.Idle) {
        this.processQueue(key, [interaction]); // Запуск нового трека, если плеер простаивает
      }
    }
    console.log(queue.length);
    await interaction.followUp({ content: 'Добавлено', ephemeral: true });
    return;
  }

  async togglePause(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();

    const key = guildId;
    const player = this.players.get(key);

    console.log(key);

    if (!player)
      return await interaction.editReply({
        content: '❌ Не удалось получить плеер\n Попробуйте перезапустить бота',
        components: [],
        embeds: [],
      });

    const isPaused = player.state.status === AudioPlayerStatus.Paused;

    if (!isPaused) {
      player.pause();
    } else player.unpause();

    // Используем рендерер для отображения состояния плеера
    const currentTrack = this.currentTracks.get(key);
    const queue = this.queues.get(key) || [];
    const nextTrack = queue.length > 0 ? queue[0].title : undefined;
    
    if (currentTrack) {
      await interaction.editReply({
        ...this.playerRenderer.renderPlayer(
          currentTrack as any,
          currentTrack,
          queue.length,
          nextTrack,
          !isPaused
        )
      });
    } else {
      await interaction.editReply({
        content: isPaused ? '▶️ Воспроизводится' : '⏸️ Пауза',
        components: [],
        embeds: [],
      });
    }
  }

  async skip(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const key = guildId;
    const player = this.players.get(key);
    if (!player) return;

    const queue = this.queues.get(key) || [];
    console.log(queue.length);
    if (queue.length > 0) {
      player.stop();
    }

    await interaction.followUp({
      content: '⏭️ Трек пропущен',
      ephemeral: true,
    });
  }

  async skipAll(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const key = guildId;
    const player = this.players.get(key);
    if (!player) return;
    player.stop();

    if (!this.queues.has(key)) return;
    this.queues.set(key, []);

    await interaction.followUp({
      content: '⏭️ Все треки пропущены',
      ephemeral: true,
    });
  }

  async shuffle(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const queue = this.queues.get(guildId);
    if (!queue || queue.length < 2) return;
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    this.queues.set(guildId, queue);
    
    // Используем рендерер для отображения статуса перемешивания
    await interaction.editReply(this.playerRenderer.renderShuffleStatus());
  }

  async repeat(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const currentMode = this.repeatMode.get(guildId) || false;
    this.repeatMode.set(guildId, !currentMode);
    
    // Используем рендерер для отображения статуса повтора
    await interaction.editReply(
      this.playerRenderer.renderRepeatStatus(!currentMode)
    );
  }

  async queue(guildId: string, [interaction]: ButtonContext) {
    await interaction.deferUpdate();
    const queue = this.queues.get(guildId) || [];
    
    // Используем рендерер для отображения очереди
    await interaction.editReply(this.playerRenderer.renderQueue(queue));
  }

  async processQueue(
    key: string,
    [interaction]: [SlashCommandContext[0] | ButtonContext[0]],
  ) {
    const player = this.players.get(key);
    console.log(key);

    if (!player) return;

    const queue = this.queues.get(key) || [];
    if (queue.length === 0) {
      this.currentTracks.set(key, null);
      console.log('⏹️ Очередь закончилась. Ожидание новых треков.');

      const player = this.players.get(key);
      if (player?.state.status === AudioPlayerStatus.Idle) {
        console.log(
          '🔄 Ожидание новых треков... Если добавят, плеер перезапустится.',
        );
      }
      return;
    }

    const checkLength = queue.length;

    const queueTrack = queue.shift()!;
    const track = await this.yandexMusicService.makeResponse(queueTrack);
    this.currentTracks.set(key, track as any);
    this.queues.set(key, queue);
    console.log(`▶️ Воспроизводится: ${track.title}`);

    const filePath = await this.downloadTrack(track.source as string);
    track.filePath = filePath;
    const resource = createAudioResource(filePath);
    player.play(resource);

    const totalTracks = this.queues.get(key)?.length;
    const nextTrack =
      totalTracks && totalTracks > 0 ? this.queues.get(key)![0].title : '';

    if (interaction && checkLength !== 0) {
      // Используем рендерер для отображения плеера
      await interaction.editReply(
        this.playerRenderer.renderPlayer(
          track,
          queueTrack,
          totalTracks || 0,
          nextTrack || ''
        )
      );
    }

    player.once(AudioPlayerStatus.Idle, () => {
      fs.unlink(filePath, (err) => err && console.error(err));

      if (this.repeatMode.get(key)) {
        queue.unshift(queueTrack);
      }

      void this.processQueue(key, [interaction]);
    });
  }

  private async downloadTrack(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const dirPath = path.join(__dirname, '..', 'downloads');
      const filePath = path.join(dirPath, `${Date.now()}.mp3`);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      throw new Error('Ошибка загрузки аудио');
    }
  }
}