import { Injectable } from '@nestjs/common';
import { LoopMode, QueueItemType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QueueService {
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

  async getQueueLength(guildId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
    });

    if (!queue) {
      return 0;
    }
  }
  async addTrackToQueue(guildId: string, trackId: string) {
    let queue = await this.prisma.queue.findFirst({
      where: {
        guildId,
      },
    });

    if (!queue) {
      queue = await this.prisma.queue.create({ data: { guildId } });
    }

    const track = await this.prisma.track.findUnique({
      where: { trackId },
    });

    if (!track) {
      throw new Error(`Track ${trackId} not found in database`);
    }

    const position = await this.prisma.queueItem.count({
      where: {
        queueId: queue.id,
      },
    });

    return this.prisma.queueItem.create({
      data: {
        queueId: queue.id,
        trackId: trackId,
        type: QueueItemType.TRACK,
        position,
      },
    });
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

    const currentPosition = await this.prisma.queueItem.count({
      where: {
        queueId: queue.id,
      },
    });

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
        currentIndex: 0,
      },
    });

    return response;
  }

  async nextTrack(guildId: string) {
    const queue = await this.getQueue(guildId);
    if (!queue || queue.items.length === 0) return;

    const currentItem = queue.items[0];

    if (currentItem.type === QueueItemType.PLAYLIST && currentItem.playlist) {
      const playlistTracks = currentItem.playlist.tracks;
      const newIndex = (currentItem.currentIndex ?? 0) + 1;

      if (newIndex < playlistTracks.length) {
        return await this.prisma.queueItem.update({
          where: { id: currentItem.id },
          data: { currentIndex: newIndex },
        });
      } else {
        await this.prisma.queueItem.delete({
          where: { id: currentItem.id },
        });
        return this.getQueue(guildId);
      }
    }

    // await this.prisma.$transaction(async (prisma) => {
    //   await prisma.queueItem.update({
    //     where: { id: queue.items[0].id },
    //     data: { position: queue.items[queue.items.length - 1].position + 1 },
    //   });
    // });

    if (queue.currentPosition < queue.items.length - 1) {
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

  async nextItem(guildId: string) {
    const queue = await this.getQueue(guildId);

    if (!queue || queue.items.length === 0) return;

    if (queue.currentPosition < queue.items.length - 1) {
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

    const currentTrack = queue.items[0];

    if (currentTrack.type === QueueItemType.PLAYLIST && currentTrack.playlist) {
      if (currentTrack.currentIndex > 0) {
        await this.prisma.queueItem.update({
          where: {
            id: currentTrack.id,
          },
          data: {
            currentIndex: currentTrack.currentIndex - 1,
          },
        });
        return this.getQueue(guildId);
      }
    }

    // await this.prisma.$transaction(async (prisma) => {
    //   await prisma.queueItem.update({
    //     where: { id: queue.items[queue.items.length - 1].id },
    //     data: { position: queue.items[0].position - 1 },
    //   });
    // });

    if (queue.currentPosition > 0) {
      await this.prisma.queue.update({
        where: { guildId },
        data: { currentPosition: { decrement: 1 } },
      });
    } else {
      await this.prisma.queue.update({
        where: { guildId },
        data: { currentPosition: queue.items.length - 1 },
      });
    }

    return this.getQueue(guildId);
  }

  async removeTrackFromQueue(trackId: string, guildId: string) {
    const queueItem = await this.prisma.queueItem.findFirst({
      where: {
        trackId,
        queue: {
          guildId,
        },
      },
    });

    if (!queueItem) return null;

    return this.prisma.queueItem.delete({
      where: {
        id: queueItem.id,
      },
    });
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
    console.log(queue);

    return queue;
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
}
