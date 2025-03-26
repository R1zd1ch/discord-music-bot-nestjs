import { Injectable, Logger } from '@nestjs/common';
import { Track } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(PlaylistService.name);

  async createPlaylist(userId: string, name: string) {
    return this.prisma.playlist.create({ data: { name, userId } });
  }

  async findByName(userId: string, name: string) {
    return this.prisma.playlist.findFirst({ where: { userId, name } });
  }

  async getPlaylists(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async getTracksFromPlaylist(playlistId: string) {
    return this.prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { track: true },
      orderBy: { position: 'asc' },
    });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    const existing = await this.prisma.playlistTrack.findUnique({
      where: { playlistId_trackId: { playlistId, trackId } },
    });

    if (existing) return existing;

    const count = await this.prisma.playlistTrack.count({
      where: { playlistId },
    });

    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: count,
        originalPosition: count,
      },
      include: { track: true },
    });
  }

  async addTracksToPlaylist(playlistId: string, tracks: Track[]) {
    this.logger.debug('Adding tracks to playlist');

    const needsRestore = await this.checkPlaylistOrder(playlistId);
    if (needsRestore) await this.restorePlaylistOrder(playlistId);

    const trackIds = tracks.map((t) => t.trackId);
    const existing = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      select: { trackId: true },
    });

    const existingIds = new Set(existing.map((t) => t.trackId));
    const newTracks = tracks.filter((t) => !existingIds.has(t.trackId));

    return this.prisma.$transaction(async (prisma) => {
      // Remove tracks not in new list
      await prisma.playlistTrack.deleteMany({
        where: { playlistId, trackId: { notIn: trackIds } },
      });

      // Add new tracks
      if (newTracks.length > 0) {
        const maxPosition = await prisma.playlistTrack
          .aggregate({
            _max: { position: true },
            where: { playlistId },
          })
          .then((res) => res._max.position ?? -1);

        await prisma.playlistTrack.createMany({
          data: newTracks.map((t, i) => ({
            playlistId,
            trackId: t.trackId,
            position: maxPosition + i + 1,
            originalPosition: maxPosition + i + 1,
          })),
        });
      }

      return prisma.playlistTrack.findMany({
        where: { playlistId },
        include: { track: true },
        orderBy: { position: 'asc' },
      });
    });
  }

  async shufflePlaylist(playlistId: string) {
    const tracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { originalPosition: 'asc' },
    });

    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    await this.prisma.$executeRaw`
      WITH positions AS (
        SELECT unnest(${shuffled.map((t) => t.trackId)}::text[]) as track_id,
               generate_series(0, array_length(${shuffled.map((t) => t.trackId)}::text[], 1) - 1) as new_position
      )
      UPDATE "PlaylistTrack" pt
      SET position = p.new_position
      FROM positions p
      WHERE pt."playlistId" = ${playlistId}
        AND pt."trackId" = p.track_id::text
    `;
  }

  private async checkPlaylistOrder(playlistId: string) {
    const mismatch = await this.prisma.playlistTrack.findFirst({
      where: {
        playlistId,
        OR: [
          {
            position: {
              not: {
                equals: this.prisma.playlistTrack.fields.originalPosition,
              },
            },
          },
          {
            originalPosition: {
              not: { equals: this.prisma.playlistTrack.fields.position },
            },
          },
        ],
      },
      select: { id: true },
    });
    return !!mismatch;
  }

  async restorePlaylistOrder(playlistId: string) {
    await this.prisma.$executeRaw`
      UPDATE "PlaylistTrack"
      SET position = "originalPosition"
      WHERE "playlistId" = ${playlistId}
    `;
  }
}
