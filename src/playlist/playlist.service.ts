import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Playlist, PlaylistTrack, Track } from '@prisma/client';
import { Cache } from 'cache-manager';
import { RedisKeys } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  private readonly logger = new Logger(PlaylistService.name);

  async createPlaylist(userId: string, name: string) {
    return this.prisma.playlist.create({ data: { name, userId } });
  }

  async findByName(userId: string, name: string) {
    return this.prisma.playlist.findFirst({ where: { userId, name } });
  }

  async getPlaylists(userId: string) {
    const cacheKey = RedisKeys.playlists(userId);
    const cached = await this.cacheManager.get<Playlist[]>(cacheKey);
    if (cached) return cached;

    const playlist = await this.prisma.playlist.findMany({
      where: { userId },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    await this.cacheManager.set(cacheKey, playlist, 30 * 60 * 1000);
    return playlist;
  }

  async getTracksFromPlaylist(playlistId: string) {
    const cacheKey = RedisKeys.playlistTracks(playlistId);
    const cached = await this.cacheManager.get<
      (PlaylistTrack & {
        track: Track;
      })[]
    >(cacheKey);

    if (cached) return cached;

    const tracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { track: true },
      orderBy: { position: 'asc' },
    });
    await this.cacheManager.set(cacheKey, tracks, 30 * 60 * 1000);

    return tracks;
  }

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    const existing = await this.prisma.playlistTrack.findUnique({
      where: { playlistId_trackId: { playlistId, trackId } },
    });

    if (existing) return existing;

    // Сначала сдвигаем все существующие треки вниз на одну позицию
    await this.prisma.$executeRaw`
    UPDATE "PlaylistTrack"
    SET position = position + 1
    WHERE "playlistId" = ${playlistId}
  `;

    // Добавляем новый трек в начало (позиция 0)
    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: 0,
        originalPosition: 0,
      },
      include: { track: true },
    });
  }

  async addTracksToPlaylist(playlistId: string, tracks: Track[]) {
    this.logger.debug('Adding tracks to playlist');

    const cacheKey = RedisKeys.playlistTracks(playlistId);
    await this.cacheManager.del(cacheKey);

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
        // Сначала сдвигаем все существующие треки вниз
        await prisma.$executeRaw`
      UPDATE "PlaylistTrack"
      SET position = position + ${newTracks.length}
      WHERE "playlistId" = ${playlistId}`;

        // Добавляем новые треки в начало (позиции 0, 1, 2, ...)
        await prisma.playlistTrack.createMany({
          data: newTracks.map((t, i) => ({
            playlistId,
            trackId: t.trackId,
            position: i,
            originalPosition: i,
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
