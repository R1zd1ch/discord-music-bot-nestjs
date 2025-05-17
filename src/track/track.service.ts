import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTrackDto } from './dtos/create-track.dto';
import { RedisKeys } from 'src/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Track } from '@prisma/client';

@Injectable()
export class TrackService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createTrack(trackDto: CreateTrackDto) {
    const track = await this.prisma.track.findFirst({
      where: {
        trackId: trackDto.trackId,
      },
    });

    if (!track) {
      return await this.prisma.track.create({
        data: trackDto,
      });
    }

    return track;
  }

  async getTrack(trackId: string) {
    const cacheKey = RedisKeys.track(trackId);

    const cachedTrack = await this.cacheManager.get<Track>(cacheKey);
    if (cachedTrack) return cachedTrack;

    const track = await this.prisma.track.findUnique({
      where: {
        trackId,
      },
    });

    await this.cacheManager.set(cacheKey, track, 60 * 60 * 24);

    if (!track) return null;

    return track;
  }

  async createTracks(tracksDto: CreateTrackDto[]) {
    const trackIds = tracksDto.map((track) => track.trackId);

    const existingTracks = await this.prisma.track.findMany({
      where: { trackId: { in: trackIds } },
    });

    const existingTrackIds = new Set(
      existingTracks.map((track) => track.trackId),
    );

    const newTracks = tracksDto.filter(
      (track) => !existingTrackIds.has(track.trackId),
    );

    if (newTracks.length > 0) {
      await this.prisma.track.createMany({
        data: newTracks,
        skipDuplicates: true,
      });
    }

    return this.prisma.track.findMany({
      where: { trackId: { in: trackIds } },
    });
  }
}
