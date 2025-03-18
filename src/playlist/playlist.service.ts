import { Injectable } from '@nestjs/common';
import { Track } from '@prisma/client';
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
    const trackIds = tracks.map((track) => track.trackId);

    const existingTrack = await this.prisma.playlistTrack.findMany({
      where: {
        playlistId,
        trackId: { in: trackIds },
      },
    });

    const existingTrackIds = new Set(
      existingTrack.map((track) => track.trackId),
    );

    const newTracks = tracks
      .map((track, index) => ({
        playlistId,
        trackId: track.trackId,
        position: index,
      }))
      .filter((track) => !existingTrackIds.has(track.trackId));

    if (newTracks.length > 0) {
      await this.prisma.playlistTrack.createMany({
        data: { ...newTracks },
      });
    }

    return this.prisma.playlistTrack.findMany({
      where: { playlistId },
      include: {
        track: true,
      },
      orderBy: { position: 'asc' },
    });
  }
}
