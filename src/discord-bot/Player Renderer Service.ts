import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { Track } from 'yandex-music-client';
import { createTrackEmbed } from './embed.music-player';
import buttonsComponents from './buttons.components';
import { ResponseTrackType } from 'src/yandex-music/types/response-track.type';

@Injectable()
export class PlayerRendererService {
  /**
   * Генерирует отображение музыкального плеера с информацией о треке и кнопками управления
   * 
   * @param track - Информация о текущем треке
   * @param queueTrack - Исходный объект трека из очереди
   * @param totalTracks - Количество треков в очереди
   * @param nextTrack - Название следующего трека
   * @param isPaused - Флаг состояния паузы
   * @returns Объект с embeds и components для отображения в сообщении
   */
  renderPlayer(
    track: ResponseTrackType,
    queueTrack: Track,
    totalTracks: number,
    nextTrack: string | undefined,
    isPaused: boolean = false,
  ) {
    const embed = createTrackEmbed(track, queueTrack, totalTracks, nextTrack);
    const components = buttonsComponents(isPaused);
    
    return {
      content: isPaused ? '⏸️ Пауза' : '▶️ Воспроизводится\n',
      embeds: [embed],
      components,
    };
  }

  /**
   * Генерирует сообщение с информацией об очереди треков
   * 
   * @param queue - Массив треков в очереди
   * @returns Объект с контентом для отображения в сообщении
   */
  renderQueue(queue: Track[]) {
    if (queue.length === 0) {
      return {
        content: '📭 Очередь пуста',
        components: [],
      };
    }
    
    const queueList = queue
      .map((track, index) => `${index + 1}. ${track.title}`)
      .join('\n');
    
    return {
      content: `🎵 Очередь:\n${queueList}`,
      components: [],
    };
  }

  /**
   * Генерирует сообщение о статусе повтора
   * 
   * @param isRepeatEnabled - Флаг включения/выключения повтора
   * @returns Объект с контентом для отображения в сообщении
   */
  renderRepeatStatus(isRepeatEnabled: boolean) {
    return {
      content: isRepeatEnabled ? '🔂 Повтор включен' : '🔁 Повтор выключен',
      components: [],
    };
  }

  /**
   * Генерирует сообщение о перемешивании очереди
   * 
   * @returns Объект с контентом для отображения в сообщении
   */
  renderShuffleStatus() {
    return {
      content: '🔀 Очередь перемешана',
      components: [],
    };
  }
}common';
import { EmbedBuilder } from 'discord.js';
import { Track } from 'yandex-music-client';
import { createTrackEmbed } from './embed.music-player';
import buttonsComponents from './buttons.components';
import { ResponseTrackType } from 'src/yandex-music/types/response-track.type';

@Injectable()
export class PlayerRendererService {
  /**
   * Генерирует отображение музыкального плеера с информацией о треке и кнопками управления
   * 
   * @param track - Информация о текущем треке
   * @param queueTrack - Исходный объект трека из очереди
   * @param totalTracks - Количество треков в очереди
   * @param nextTrack - Название следующего трека
   * @param isPaused - Флаг состояния паузы
   * @returns Объект с embeds и components для отображения в сообщении
   */
  renderPlayer(
    track: ResponseTrackType,
    queueTrack: Track,
    totalTracks: number,
    nextTrack: string | undefined,
    isPaused: boolean = false,
  ) {
    const embed = createTrackEmbed(track, queueTrack, totalTracks, nextTrack);
    const components = buttonsComponents(isPaused);
    
    return {
      content: isPaused ? '⏸️ Пауза' : '▶️ Воспроизводится\n',
      embeds: [embed],
      components,
    };
  }

  /**
   * Генерирует сообщение с информацией об очереди треков
   * 
   * @param queue - Массив треков в очереди
   * @returns Объект с контентом для отображения в сообщении
   */
  renderQueue(queue: Track[]) {
    if (queue.length === 0) {
      return {
        content: '📭 Очередь пуста',
        components: [],
      };
    }
    
    const queueList = queue
      .map((track, index) => `${index + 1}. ${track.title}`)
      .join('\n');
    
    return {
      content: `🎵 Очередь:\n${queueList}`,
      components: [],
    };
  }

  /**
   * Генерирует сообщение о статусе повтора
   * 
   * @param isRepeatEnabled - Флаг включения/выключения повтора
   * @returns Объект с контентом для отображения в сообщении
   */
  renderRepeatStatus(isRepeatEnabled: boolean) {
    return {
      content: isRepeatEnabled ? '🔂 Повтор включен' : '🔁 Повтор выключен',
      components: [],
    };
  }

  /**
   * Генерирует сообщение о перемешивании очереди
   * 
   * @returns Объект с контентом для отображения в сообщении
   */
  renderShuffleStatus() {
    return {
      content: '🔀 Очередь перемешана',
      components: [],
    };
  }
}