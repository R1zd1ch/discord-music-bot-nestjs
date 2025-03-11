import { Injectable } from '@nestjs/common';
import { QueueItemType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(guildId: string) {
    return this.prisma.queue.findUnique({
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
                },
              },
            },
          },
        },
      },
    });
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

    const position = await this.prisma.queueItem.count({
      where: {
        queueId: queue.id,
      },
    });

    return this.prisma.queueItem.create({
      data: {
        queueId: queue.id,
        trackId,
        type: QueueItemType.TRACK,
        position,
      },
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

    return this.prisma.queueItem.create({
      data: {
        queueId: queue.id,
        playlistId,
        type: QueueItemType.PLAYLIST,
        position,
        currentIndex: 0,
      },
    });
  }

  async nextTrack(guildId: string) {
    const queue = await this.getQueue(guildId);
    if (!queue || queue.items.length < 2) return;

    const currentTrack = queue.items[0];

    if (currentTrack.type === QueueItemType.PLAYLIST && currentTrack.playlist) {
      const playlistTracks = currentTrack.playlist.tracks;
      if (currentTrack.currentIndex < playlistTracks.length - 1) {
        await this.prisma.queueItem.update({
          where: {
            id: currentTrack.id,
          },
          data: {
            currentIndex: currentTrack.currentIndex + 1,
          },
        });
        return this.getQueue(guildId);
      }
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.queueItem.update({
        where: { id: queue.items[0].id },
        data: { position: queue.items[queue.items.length - 1].position + 1 },
      });
    });

    return this.getQueue(guildId);
  }

  async prevTrack(guildId: string) {
    const queue = await this.getQueue(guildId);
    if (!queue || queue.items.length < 2) return;

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

    await this.prisma.$transaction(async (prisma) => {
      await prisma.queueItem.update({
        where: { id: queue.items[queue.items.length - 1].id },
        data: { position: queue.items[0].position - 1 },
      });
    });

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
}
