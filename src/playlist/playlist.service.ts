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
        position: length,
        originalPosition: length,
      },
      include: {
        track: true,
      },
    });
  }

  async addTracksToPlaylist(playlistId: string, tracks: Track[]) {
    this.logger.debug('adding tracks to playlist');
    const needsRestore = await this.checkPlaylistOrder(playlistId);

    if (needsRestore) {
      await this.restorePlaylistOrder(playlistId);
    }

    const trackIds = new Set(tracks.map((track) => track.trackId));

    const allTracksFromPlaylist = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { originalPosition: 'asc' },
    });

    const tracksToDelete = allTracksFromPlaylist.filter(
      (track) => !trackIds.has(track.trackId),
    );

    const existingTrackIds = new Set(
      allTracksFromPlaylist.map((t) => t.trackId),
    );
    const newTracks = tracks.filter(
      (track) => !existingTrackIds.has(track.trackId),
    );

    return this.prisma.$transaction(async (prisma) => {
      if (tracksToDelete.length > 0) {
        await prisma.playlistTrack.deleteMany({
          where: {
            playlistId,
            trackId: { in: tracksToDelete.map((t) => t.trackId) },
          },
        });
      }

      if (newTracks.length > 0) {
        await prisma.playlistTrack.updateMany({
          where: { playlistId },
          data: { position: { increment: newTracks.length } },
        });

        await prisma.playlistTrack.createMany({
          data: newTracks.map((track, index) => ({
            playlistId,
            trackId: track.trackId,
            position: index,
            originalPosition: index,
          })),
          skipDuplicates: true,
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

    const shuffledTracks = [...tracks];

    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [
        shuffledTracks[j],
        shuffledTracks[i],
      ];
    }

    await this.prisma.$transaction(
      shuffledTracks.map((track, index) =>
        this.prisma.playlistTrack.update({
          where: {
            playlistId_trackId: {
              playlistId,
              trackId: track.trackId,
            },
          },
          data: { position: index },
        }),
      ),
    );
  }

  private async checkPlaylistOrder(playlistId: string) {
    const tracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { originalPosition: 'asc' },
    });

    return tracks.some(
      (track, index) =>
        track.position !== index || track.originalPosition !== index,
    );
  }

  async restorePlaylistOrder(playlistId: string) {
    const tracks = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { originalPosition: 'asc' },
    });

    await this.prisma.$transaction(
      tracks.map((track) =>
        this.prisma.playlistTrack.update({
          where: {
            playlistId_trackId: {
              playlistId,
              trackId: track.trackId,
            },
          },
          data: {
            position: track.originalPosition,
          },
        }),
      ),
    );
  }
}
