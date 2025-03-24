import { Injectable, Logger } from '@nestjs/common';
import { LoopMode, QueueItem, QueueItemType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(guildId: string) {
    const queue = this.prisma.queue.findUnique({
      where: {
        guildId,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            track: true,
            playlist: {
              include: {
                tracks: {
                  include: {
                    track: true,
                  },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return queue;
  }

  async getPlaylistsFromQueue(guildId: string) {
    const queuePlaylists = await this.prisma.queueItem.findMany({
      where: {
        queue: {
          guildId,
        },
        type: QueueItemType.PLAYLIST,
      },
      select: {
        playlist: true,
      },
    });

    if (!queuePlaylists || queuePlaylists.length === 0) return [];

    return queuePlaylists;
  }

  async shuffleQueue(guildId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: {
        guildId,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!queue || queue.items.length < 2) return;

    const currentItem = this.getCurrentItem(queue);
    if (!currentItem) return;

    const itemsToShuffle = queue.items.filter(
      (item) => item.id !== currentItem.id,
    );

    for (let i = itemsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsToShuffle[i], itemsToShuffle[j]] = [
        itemsToShuffle[j],
        itemsToShuffle[i],
      ];
    }

    const newItems = currentItem
      ? [currentItem, ...itemsToShuffle]
      : itemsToShuffle;

    await this.reorderQueueItems(newItems);

    if (currentItem) {
      const newPosition = newItems.findIndex(
        (item) => item.id === currentItem.id,
      );

      const toPosition = newPosition;
      await this.prisma.queue.update({
        where: { guildId },
        data: { currentPosition: toPosition },
      });
    }
  }

  async restoreQueueOrder(guildId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: {
        guildId,
      },
      include: {
        items: {
          orderBy: { originalPosition: 'asc' },
        },
      },
    });

    if (!queue) return;

    await this.reorderQueueItems(queue.items);

    // Сбрасываем currentPosition
    await this.prisma.queue.update({
      where: { guildId },
      data: { currentPosition: 0 },
    });
  }

  private async reorderQueueItems(items: QueueItem[]) {
    await this.prisma.$transaction(
      items.map((item, index) =>
        this.prisma.queueItem.update({
          where: { id: item.id },
          data: {
            position: index,
            originalPosition:
              item.originalPosition === -1 ? index : item.originalPosition,
          },
        }),
      ),
    );
  }

  async addTracksToQueue(guildId: string, trackIds: string[]) {
    let queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
    });

    if (!queue) {
      queue = await this.prisma.queue.create({
        data: {
          guildId,
        },
      });
    }

    // const currentPosition =
    //   (await this.prisma.queueItem.count({
    //     where: {
    //       queueId: queue.id,
    //     },
    //   })) + 1;

    const queueItems = trackIds.map((trackId, index) => ({
      queueId: queue.id,
      trackId,
      type: QueueItemType.TRACK,
      position: index,
      originalPosition: -1,
    }));

    return this.prisma.queueItem.createMany({
      data: queueItems,
    });
  }

  async addPlaylistToQueue(guildId: string, playlistId: string) {
    let queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
    });

    if (!queue) {
      queue = await this.prisma.queue.create({ data: { guildId } });
    }

    const position = await this.prisma.queueItem.count({
      where: {
        queueId: queue.id,
      },
    });

    const response = await this.prisma.queueItem.create({
      data: {
        queueId: queue.id,
        playlistId,
        type: QueueItemType.PLAYLIST,
        position,
        originalPosition: position,
        currentIndex: 0,
      },
    });

    return response;
  }

  async nextTrack(guildId: string) {
    const queue = await this.getQueue(guildId);
    if (!queue || queue.items.length === 0) return;

    const currentItem = this.getCurrentItem(queue);
    let newPosition = queue.currentPosition;

    if (!currentItem) return;
    //eslint-disable-next-line
    //@ts-ignore
    //eslint-disable-next-line
    if (currentItem.type === QueueItemType.PLAYLIST && currentItem.playlist) {
      //eslint-disable-next-line
      //@ts-ignore
      //eslint-disable-next-line
      const playlistTracks = currentItem.playlist.tracks;
      const newIndex = (currentItem.currentIndex ?? 0) + 1;
      //eslint-disable-next-line
      if (newIndex < playlistTracks.length) {
        return await this.prisma.queueItem.update({
          where: { id: currentItem.id },
          data: { currentIndex: newIndex },
        });
      }
    }

    this.logger.log(`currentPosition: ${queue.currentPosition}`);

    if (queue.currentPosition < queue.items.length - 1) {
      newPosition = queue.currentPosition + 1;
    }

    await this.prisma.queue.update({
      where: { guildId },
      data: { currentPosition: newPosition },
    });
    return;
  }

  async nextItem(guildId: string) {
    const queue = await this.getQueue(guildId);

    if (!queue || queue.items.length === 0) return;

    this.logger.debug(
      `currentPosition: ${queue.currentPosition} length: ${queue.items.length}`,
    );

    if (queue.currentPosition < queue.items.length - 1) {
      this.logger.debug(`skiping element`);
      await this.prisma.queue.update({
        where: {
          guildId,
        },
        data: {
          currentPosition: queue.currentPosition + 1,
        },
      });
    }

    return this.getQueue(guildId);
  }

  async prevTrack(guildId: string) {
    const queue = await this.getQueue(guildId);
    if (!queue || queue.items.length === 0) return;

    let newPosition = queue.currentPosition;
    const currentItem = this.getCurrentItem(queue);

    if (!currentItem) return;

    //eslint-disable-next-line
    //@ts-ignore
    //eslint-disable-next-line
    if (currentItem?.type === QueueItemType.PLAYLIST) {
      if ((currentItem.currentIndex ?? 0) > 0) {
        // Возврат внутри плейлиста
        await this.prisma.queueItem.update({
          where: { id: currentItem.id },
          data: { currentIndex: { decrement: 1 } },
        });
        return;
      }
    }

    if (queue.currentPosition > 0) {
      newPosition = queue.currentPosition - 1;
    }

    await this.prisma.queue.update({
      where: { guildId },
      data: { currentPosition: newPosition },
    });
    return;
  }

  async setVolume(guildId: string, volume: number) {
    return this.prisma.queue.update({
      where: {
        guildId,
      },
      data: { volume: Math.min(Math.max(volume, 0), 200) },
    });
  }

  async getVolume(guildId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { guildId },
      select: {
        volume: true,
      },
    });

    return queue?.volume ?? 100;
  }

  async updatePlayerMessageId(guildId: string, messageId: string) {
    return this.prisma.queue.update({
      where: {
        guildId,
      },
      data: {
        playerMessageId: messageId,
      },
    });
  }

  async getPlayerMessageId(guildId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
      select: {
        playerMessageId: true,
      },
    });
    return queue?.playerMessageId;
  }

  async setLoopMode(guildId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
      select: {
        loopMode: true,
      },
    });

    const loopMode = queue?.loopMode;

    if (!loopMode) return;

    const updatedLoopMode =
      loopMode === LoopMode.NONE ? LoopMode.TRACK : LoopMode.NONE;

    await this.prisma.queue.update({
      where: {
        guildId,
      },
      data: {
        loopMode: updatedLoopMode,
      },
    });
    return updatedLoopMode;
  }

  async clearQueue(guildId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
    });

    if (!queue) return;

    return this.prisma.queueItem
      .deleteMany({
        where: {
          queueId: queue.id,
        },
      })
      .then(() =>
        this.prisma.queue.delete({
          where: {
            id: queue.id,
          },
        }),
      );
  }

  async removeItemFromQueue(itemId: string) {
    const queueItem = await this.prisma.queueItem.findFirst({
      where: {
        id: itemId,
      },
    });

    if (!queueItem) return null;

    return this.prisma.queueItem.delete({
      where: {
        id: queueItem.id,
      },
    });
  }

  getCurrentItem(queue: any): QueueItem | null {
    //eslint-disable-next-line
    if (queue.currentPosition >= queue.items.length) return null;
    //eslint-disable-next-line
    return queue.items[queue.currentPosition];
  }
}
