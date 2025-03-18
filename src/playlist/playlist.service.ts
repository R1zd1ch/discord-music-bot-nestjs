import { Injectable, Logger } from '@nestjs/common';
import { Track } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(PlaylistService.name);

  async createPlaylist(userId: string, name: string) {
    return this.prisma.playlist.create({
      data: {
        name,
        userId,
      },
    });
  }

  async findByName(userId: string, name: string) {
    return await this.prisma.playlist.findFirst({
      where: {
        userId,
        name,
      },
    });
  }

  async getPlaylists(userId: string) {
    return this.prisma.playlist.findMany({
      where: {
        userId,
      },
      include: {
        tracks: {
          include: {
            track: true,
          },
        },
      },
    });
  }

  async getTracksFromPlaylist(playlistId: string) {
    const tracks = await this.prisma.playlistTrack.findMany({
      where: {
        playlistId,
      },
      include: {
        track: true,
      },
      orderBy: { position: 'asc' },
    });

    return tracks.filter((t) => !!t.track);
  }

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    const track = await this.prisma.playlistTrack.findFirst({
      where: {
        trackId,
      },
      include: { track: true },
    });

    if (track) return track;

    const length = (
      await this.prisma.playlistTrack.findMany({
        where: {
          playlistId,
        },
      })
    ).length;

    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: length - 1,
      },
      include: {
        track: true,
      },
    });
  }

  async addTracksToPlaylist(playlistId: string, tracks: Track[]) {
    this.logger.debug('adding tracks to playlist');
    const trackIds = tracks.map((track) => track.trackId);

    // Получаем существующие треки
    const existingTracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId, trackId: { in: trackIds } },
    });

    // Фильтруем только новые треки
    const existingTrackIds = new Set(existingTracks.map((t) => t.trackId));
    const newTracks = tracks.filter(
      (track) => !existingTrackIds.has(track.trackId),
    );

    if (newTracks.length === 0) {
      return this.prisma.playlistTrack.findMany({
        where: { playlistId },
        include: { track: true },
        orderBy: { position: 'asc' },
      });
    }

    // Используем транзакцию для атомарности операций
    return this.prisma.$transaction(async (prisma) => {
      // Сдвигаем все существующие позиции вниз
      await prisma.playlistTrack.updateMany({
        where: { playlistId },
        data: { position: { increment: newTracks.length } },
      });

      // Добавляем новые треки в начало
      await prisma.playlistTrack.createMany({
        data: newTracks.map((track, index) => ({
          playlistId,
          trackId: track.trackId,
          position: index,
        })),
        skipDuplicates: true,
      });

      return prisma.playlistTrack.findMany({
        where: { playlistId },
        include: { track: true },
        orderBy: { position: 'asc' },
      });
    });
  }
}
