//eslint-disable-next-line
//@ts-nocheck
import { Injectable } from '@nestjs/common';
import { Queue, QueueItem, QueueItemType, Track } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { SlashCommandContext } from 'necord';
import { QueueService } from 'src/queue/queue.service';
import buttonsComponents from './buttons.components';

@Injectable()
export class PlayerService {
  constructor(private readonly queueService: QueueService) {}
  async renderMusicMessage(
    currentTrack: Track,
    queue: Queue,
    [interaction]: SlashCommandContext,
    isPaused: boolean = false,
  ) {
    /* eslint-disable */

    if (!currentTrack) {
      this.logger.error('Current track is undefined');
      return;
    }

    const queueItems = queue.items;
    const queueTracks = queueItems.filter(
      (item) => item.type === QueueItemType.TRACK,
    );
    const queuePlaylists = queueItems.filter(
      (item) => item.type === QueueItemType.PLAYLIST,
    );
    console.log(queuePlaylists.length);

    const queueTracksLength = queueTracks.length || 0;
    const playlistTracksLength =
      queuePlaylists.reduce((acc, item: QueueItem) => {
        const itemsCount = item.playlist.tracks.length - item.currentIndex;

        return acc + itemsCount;
      }, 0) || 0;

    console.log(playlistTracksLength);

    let nextTrack;
    if (queueItems.length > 0) {
      if (
        queueItems[0].type === QueueItemType.PLAYLIST &&
        queueItems[0].playlist.tracks &&
        queueItems[0].playlist.tracks.length - 2 > queueItems[0].currentIndex
      ) {
        const playlistItem = queueItems[0];
        nextTrack =
          playlistItem.playlist.tracks[playlistItem.currentIndex + 1].track ||
          null;
      } else {
        nextTrack = queueTracks[0].track || null;
      }
    }

    if (nextTrack && !nextTrack.title) {
      nextTrack = null;
    }

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

    if (queueTracksLength > 0 || playlistTracksLength > 0) {
      embed.addFields({
        name: '📜 До конца',
        value: `${queueTracksLength + playlistTracksLength} трек(ов)`,
        inline: false,
      });
    }

    if (nextTrack) {
      embed.addFields(
        { name: '\u200B', value: '\u200B' },
        { name: '⏭ Следующий трек', value: nextTrack.title, inline: true },
        { name: '', value: '', inline: true },
        { name: '🎤 Исполнитель', value: nextTrack.artist, inline: true },
      );
    }

    if (queue.playerMessageId) {
      const oldMessage = await interaction.channel.messages.fetch(
        queue.playerMessageId,
      );
      if (oldMessage) {
        await oldMessage.edit({
          embeds: [embed],
          fetchReply: true,
          components: [...buttonsComponents(isPaused)],
        });
        return;
      }
      return;
    }

    const message = await interaction.editReply({
      embeds: [embed],
      fetchReply: true,
      components: [...buttonsComponents(isPaused)],
    });

    await this.queueService.updatePlayerMessageId(
      interaction.guildId,
      message.id,
    );

    return;
  }

  private formatDuration(ms: string): string {
    const numberedDuratin = Number(ms);
    return `${Math.floor(ms / 60000)}:${((ms / 1000) % 60)
      .toFixed(0)
      .padStart(2, '0')}`;
  }
}
