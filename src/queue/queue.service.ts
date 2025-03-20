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

    const currentPosition =
      (await this.prisma.queueItem.count({
        where: {
          queueId: queue.id,
        },
      })) + 1;

    const queueItems = trackIds.map((trackId, index) => ({
      queueId: queue.id,
      trackId,
      type: QueueItemType.TRACK,
      position: currentPosition + index,
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

    const position =
      (await this.prisma.queueItem.count({
        where: {
          queueId: queue.id,
        },
      })) + 1;

    const response = await this.prisma.queueItem.create({
      data: {
        queueId: queue.id,
        playlistId,
        type: QueueItemType.PLAYLIST,
        position,
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
        return;
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
