import { Injectable, Logger } from '@nestjs/common';
import { Queue, QueueItem, QueueItemType, Track } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { SlashCommandContext } from 'necord';
import { QueueService } from 'src/queue/queue.service';
import buttonsComponents from './buttons.components';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);
  constructor(private readonly queueService: QueueService) {}

  async renderMusicMessage(
    currentTrack: Track,
    queue: Queue,
    [interaction]: SlashCommandContext,
    isPaused: boolean = false,
  ) {
    if (!currentTrack) {
      this.logger.error('Current track is undefined');
      return;
    }

    try {
      // eslint-disable-next-line
      //@ts-ignore
      // eslint-disable-next-line
      const queueItems = queue.items;
      const [queueTracks, queuePlaylists] = this.splitQueueItems(
        queueItems as QueueItem[],
      );

      const remainingTracks = this.calculateRemainingTracks(
        queueTracks,
        queuePlaylists,
        queue.currentPosition,
      );

      // eslint-disable-next-line
      const nextTrack = this.getNextTrack(queueItems as QueueItem[]);
      const embed = this.buildEmbed(
        currentTrack,
        remainingTracks,
        nextTrack as Track,
      );

      await this.updateOrCreateMessage([interaction], queue, embed, isPaused);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private splitQueueItems(items: QueueItem[]) {
    return items.reduce(
      (acc, item) => {
        if (item.type === QueueItemType.TRACK) {
          acc[0].push(item);
        } else {
          acc[1].push(item);
        }
        return acc;
      },
      [[], []] as [QueueItem[], QueueItem[]],
    );
  }

  private calculateRemainingTracks(
    tracks: QueueItem[],
    playlists: QueueItem[],
    currentPosition: number,
  ) {
    const playlistsCount = playlists.reduce((acc, item) => {
      const currentIndex = item.currentIndex ?? 0;
      // eslint-disable-next-line
      //@ts-ignore
      // eslint-disable-next-line
      return acc + (item.playlist.tracks.length - currentIndex - 1);
    }, 0);
    // const tracksCount =
    //   tracks.length + playlists.length - playlistsCount - currentPosition - 1;

    const tracksCount = tracks.length;

    return tracksCount + playlistsCount;
  }

  private async updateOrCreateMessage(
    [interaction]: SlashCommandContext,
    queue: Queue,
    embed: EmbedBuilder,
    isPaused: boolean,
  ) {
    try {
      if (queue.playerMessageId) {
        const channel = interaction.channel!;
        const message = await channel.messages.fetch(queue.playerMessageId);

        if (message) {
          await message.edit({
            embeds: [embed],
            components: buttonsComponents(isPaused),
          });
          return;
        }
      }

      const newMessage = await interaction.editReply({
        embeds: [embed],
        components: buttonsComponents(isPaused),
      });

      await this.queueService.updatePlayerMessageId(
        interaction.guildId!,
        newMessage.id,
      );
    } catch (error) {
      this.logger.error('Message update failed', error);
    }
  }

  private getNextTrack(items: QueueItem[]) {
    this.logger.debug('getting next track');
    if (items.length === 0) return null;
    this.logger.debug('not null');

    const firstItem = items[0];
    if (firstItem.type === QueueItemType.PLAYLIST) {
      const currentIndex = firstItem.currentIndex ?? 0;
      // eslint-disable-next-line
      //@ts-ignore
      // eslint-disable-next-line
      return firstItem?.playlist?.tracks[currentIndex + 1]?.track ?? null;
    }

    //todo доделать для 2 треков

    //eslint-disable-next-line
    //@ts-ignore
    // eslint-disable-next-line
    return firstItem.track ?? null;
  }

  private buildEmbed(
    currentTrack: Track,
    remainingTracks: number,
    nextTrack: Track,
  ) {
    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`🎵 Сейчас играет: ${currentTrack.title}`)
      .setURL(currentTrack.url || '')
      .setThumbnail(currentTrack.coverUrl || '')
      .addFields(
        { name: '👤 Исполнитель', value: currentTrack.artist, inline: true },
        {
          name: '🕒 Длительность',
          value: this.formatDuration(currentTrack.duration),
          inline: true,
        },
      );

    if (remainingTracks > 0) {
      embed.addFields({
        name: '📜 До конца',
        value: `${remainingTracks} трек(ов)`,
        inline: false,
      });
    }

    if (remainingTracks < 1) {
      embed.addFields({
        name: '📜 До конца',
        value: 'Треки закончились',
        inline: false,
      });
    }
    // eslint-disable-next-line
    //@ts-ignore
    if (nextTrack || (nextTrack && nextTrack?.title)) {
      embed.addFields(
        { name: '\u200B', value: '\u200B' },
        { name: '⏭ Следующий трек', value: nextTrack.title, inline: true },
        { name: '', value: '', inline: true },
        { name: '🎤 Исполнитель', value: nextTrack.artist, inline: true },
      );
    }

    if (!nextTrack || !nextTrack?.title) {
      embed.addFields(
        { name: '\u200B', value: '\u200B' },
        { name: '⏭ Следующий трек', value: 'Треки закончились', inline: true },
        { name: '', value: '', inline: true },
        { name: '🎤 Исполнитель', value: 'Нет исполнителя', inline: true },
      );
    }

    return embed;
  }

  private formatDuration(ms: string): string {
    const duration = Number(ms);
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
