//eslint-disable-next-line
//@ts-nocheck
import { Injectable } from '@nestjs/common';
import { Queue, QueueItem, QueueItemType, Track } from '@prisma/client';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { SlashCommandContext } from 'necord';
import { QueueService } from 'src/queue/queue.service';
import { Jimp } from 'jimp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PlayerService {
  constructor(private readonly queueService: QueueService) {}
  async renderMusicMessage(
    currentTrack: Track,
    queue: Queue,
    [interaction]: SlashCommandContext,
  ) {
    /* eslint-disable */
    const bgPath = await this.generateTrackCard(currentTrack);
    const buildedBgPath = new AttachmentBuilder(bgPath);
    console.log(buildedBgPath);
    console.log(bgPath);

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
        const itemsCount =
          item.playlist.tracks.length - (item.currentIndex + 1);

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

    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`🎵 Сейчас играет: ${currentTrack.title}`)
      .setURL(currentTrack.url || '')
      .setThumbnail(currentTrack.coverUrl || '')
      .addFields(
        { name: '👤 Исполнитель', value: currentTrack.artist, inline: true },
        { name: '🕒 Длительность', value: currentTrack.duration, inline: true },
      )
      .setImage(`attachment://${bgPath}` || '');

    if (queueTracksLength > 0 || playlistTracksLength > 0) {
      embed.addFields({
        name: '📜 В очереди',
        value: `${queueTracksLength + playlistTracksLength - 1} трек(ов)`,
        inline: false,
      });
    }

    if (nextTrack) {
      embed.addFields(
        { name: '\u200B', value: '\u200B' }, // Разделитель
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
        await oldMessage.edit({ embeds: [embed] });
        return;
      }
      return;
    }

    const message = await interaction.editReply({
      embeds: [embed],
      fetchReply: true,
    });

    await this.queueService.updatePlayerMessageId(
      interaction.guildId,
      message.id,
    );

    setTimeout(async () => {
      fs.unlink(bgPath, (err) => {
        if (err) {
          console.error('error unlink');
        }
      });
    }, 5000);

    return;
  }

  private async generateTrackCard(track: Track) {
    //eslint-enable
    //@ts-check
    // const font = await Jimp.loadFont();
    try {
      console.log(track);
      const image = await Jimp.read(track.coverUrl as string);
      image.resize({ w: 200, h: 200 });
      const background = new Jimp({
        width: 800,
        height: 300,
        color: '#E8D3C7',
      });
      const newImage = await background.composite(image, 0, 0);

      const dirPath = path.join(__dirname, '..', '..', 'temp');
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      const tempPath = path.join(dirPath, `${Date.now()}.png`);

      await newImage.write(tempPath).catch((err) => console.error(err));
      return tempPath;
    } catch (e) {
      console.error('error generate', e);
      throw new Error('Generate track card error');
    }
  }
}
