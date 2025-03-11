import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlaylist(userId: string, name: string) {
    return this.prisma.playlist.create({
      data: {
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

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
      },
    });
  }
}
