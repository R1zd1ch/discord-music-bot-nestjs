import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueItem, QueueItemType, Track } from '@prisma/client';
import { Cache } from 'cache-manager';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { SlashCommandContext } from 'necord';
import { RedisKeys } from 'src/constants';
import { QueueService } from 'src/queue/queue.service';

@Injectable()
export class QueuePaginationService {
  private readonly logger = new Logger(QueuePaginationService.name);

  public constructor(
    private queueService: QueueService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async pagination(
    [interaction]: SlashCommandContext,
    pages: EmbedBuilder[],
    time: number,
  ) {
    try {
      await interaction.deferReply({ ephemeral: true });

      if (pages.length === 1) {
        return await interaction.editReply({
          embeds: pages,
          components: [],
        });
      }

      let index = 0;

      const getButtons = () => {
        const first = new ButtonBuilder()
          .setCustomId('pageFirst')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === 0);

        const prev = new ButtonBuilder()
          .setCustomId('pagePrev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === 0);

        const pageCount = new ButtonBuilder()
          .setCustomId('pageCounter')
          .setLabel(`${index + 1} / ${pages.length}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const next = new ButtonBuilder()
          .setCustomId('pageNext')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === pages.length - 1);

        const last = new ButtonBuilder()
          .setCustomId('pageLast')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === pages.length - 1);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          first,
          prev,
          pageCount,
          next,
          last,
        );
      };

      const msg = await interaction.editReply({
        embeds: [pages[index]],
        components: [getButtons()],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', (i) => {
        void (async () => {
          if (i.user.id !== interaction.user.id)
            return i.reply({
              content: '❌ Вы не можете использовать эту команду!',
              ephemeral: true,
            });

          try {
            await i.deferUpdate();

            switch (i.customId) {
              case 'pageFirst':
                index = 0;
                break;
              case 'pagePrev':
                if (index > 0) index--;
                break;
              case 'pageNext':
                if (index < pages.length - 1) index++;
                break;
              case 'pageLast':
                index = pages.length - 1;
                break;
            }

            await interaction.editReply({
              embeds: [pages[index]],
              components: [getButtons()],
            });

            collector.resetTimer();
          } catch (error) {
            this.logger.error(error);
          }
        })();
      });

      return msg;
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async testPagination([interaction]: SlashCommandContext) {
    const data = await this.getDataForQueueBuild(interaction.guildId!);
    const tracks = data.tracks;
    const currentTrack = data.currentTrack;
    const currentItem = data.currentItem;

    if (!data || !tracks || !currentTrack || !currentItem) {
      await interaction.reply({
        content: 'Нет треков в очереди',
        ephemeral: true,
      });
      return;
    }
    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < tracks.length; i += 10) {
      const items = tracks.slice(i, i + 10);
      const embed = new EmbedBuilder()
        .setColor('Purple')
        .setTitle(
          //eslint-disable-next-line
          //@ts-ignore
          //eslint-disable-next-line
          `Сейчас играет: ${currentItem.type === 'PLAYLIST' ? `Плейлист ${currentItem?.playlist?.name} ` : `Трек ${currentTrack?.title}`} `,
        )
        .setDescription(
          items
            .map((track, index) => {
              const trackNumber = i + index + 1;

              return `${trackNumber}.  [${track.title} - ${track.artist}](${track.url ?? ''}) — ${this.getTrackTime(track.duration)}`;
            })
            .join('\n'),
        )
        .addFields([
          {
            name: 'Продолжительность',
            value: this.getTotalTime(tracks),
            inline: true,
          },
          {
            name: '',
            value: '\u200B',
            inline: true,
          },
          {
            name: `Всего треков:`,
            value: `${tracks.length}`,
            inline: true,
          },
        ]);

      embeds.push(embed);
    }

    await this.pagination([interaction], embeds, 10000);
  }

  private async getDataForQueueBuild(guildId: string) {
    const cacheKey = RedisKeys.queuePagination(guildId);
    const cachedData = await this.cacheManager.get<{
      currentItem: QueueItem | null;
      currentTrack: Track | null;
      tracks: Track[] | null;
    }>(cacheKey);
    if (cachedData) {
      this.logger.debug('Using cached pagination data');
      return cachedData;
    }

    const data = cachedData
      ? cachedData
      : await this.queueService.getQueue(guildId);

    const currentItem = this.queueService.getCurrentItem(data);
    //eslint-disable-next-line
    const currentTrack: Track =
      currentItem?.type === QueueItemType.TRACK
        ? //eslint-disable-next-line
          //@ts-ignore
          //eslint-disable-next-line
          currentItem?.track
        : //eslint-disable-next-line
          //@ts-ignore
          //eslint-disable-next-line
          currentItem?.playlist?.tracks[currentItem?.currentIndex || 0]?.track;

    const tracks = data?.items.flatMap((item) =>
      item.track
        ? [item.track]
        : item.playlist?.tracks.map((t) => t.track) || [],
    );

    await this.cacheManager.set(cacheKey, data, 10 * 1000);

    return {
      currentItem,
      currentTrack,
      tracks,
    };
  }

  private getTotalTime(tracks: Track[]) {
    const totalDuration = tracks
      .map((t) => Number(t.duration))
      .reduce((acc: number, cur: number) => {
        return acc + cur;
      }, 0);

    const hours = Math.floor(totalDuration / 3600000);
    const minutes = Math.floor((totalDuration % 3600000) / 60000);
    const seconds = Math.floor((totalDuration % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private getTrackTime(duration: string) {
    const minutes = Math.floor(Number(duration) / 60000);
    const seconds = Math.floor((Number(duration) % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
}
