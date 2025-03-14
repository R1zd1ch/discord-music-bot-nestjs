import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.playlistTrack.findMany({
      where: {
        playlistId,
      },
      include: {
        track: true,
      },
    });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    const track = await this.prisma.playlistTrack.findFirst({
      where: {
        trackId,
      },
      include: { track: true },
    });

    if (track) return track;

    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
      },
      include: {
        track: true,
      },
    });
  }

  async addTracksToPlaylist(playlistId: string, trackIds: string[]) {
    const existingTracks = await this.prisma.playlistTrack.findMany({
      where: {
        playlistId,
        trackId: { in: trackIds },
      },
      select: { trackId: true },
    });

    const existingTrackIds = new Set(
      existingTracks.map((track) => track.trackId),
    );

    const newTracks = trackIds
      .filter((trackId) => !existingTrackIds.has(trackId))
      .map((trackId) => ({
        playlistId,
        trackId,
      }));

    if (newTracks.length > 0) {
      await this.prisma.playlistTrack.createMany({
        data: newTracks,
      });
    }

    return this.prisma.playlistTrack.findMany({
      where: { playlistId },
      include: {
        track: true,
      },
    });
  }
}
