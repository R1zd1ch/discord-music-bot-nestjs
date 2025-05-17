import { Inject, Injectable, Logger } from '@nestjs/common';
import { YandexMusicClient } from 'yandex-music-client';
import { getTrackUrl } from 'yandex-music-client/trackUrl';
import { TrackService } from 'src/track/track.service';
import { CreateTrackDto } from 'src/track/dtos/create-track.dto';
import { Track } from '@prisma/client';
import { RedisKeys } from 'src/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class YandexMusicService {
  private logger = new Logger(YandexMusicService.name);
  constructor(
    private readonly yandexMusicClient: YandexMusicClient,
    private readonly tracksService: TrackService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async searchYM(query: string) {
    if (!query) return { tracks: [] };

    const cacheKey = RedisKeys.searchResult(query);
    const cachedResult = await this.cacheManager.get<{
      tracks: Track[];
      playlistName?: string;
    }>(cacheKey);
    if (cachedResult) {
      this.logger.debug('Returned cached result');
      return cachedResult;
    }

    this.logger.log(`Received search query: ${query}`);

    let result: {
      tracks: Track[];
      playlistName?: string;
    };

    switch (true) {
      case query.includes('users/') && query.includes('playlists/'):
        result = await this.getTracksFromPlaylistYM(query);
        break;

      case query.includes('album/') && query.includes('track/'):
        result = await this.getTrackByIdYM(query);
        break;

      case query.includes('album/'):
        result = await this.getTracksFromAlbumYM(query);
        break;
      default:
        result = await this.getTrackByName(query);
        break;
    }

    await this.cacheManager.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  }

  async getTrackByName(query: string) {
    if (!query) return { tracks: [] };
    const response = await this.yandexMusicClient.search.search(
      query,
      1,
      'track',
      true,
    );

    if (!response) return { tracks: [] };

    const result = response?.result?.tracks?.results[0];

    if (!result) return { tracks: [] };

    const toDtoTrack = {
      trackId: result.realId,
      title: result.title,
      artist: result.artists[0]?.name || 'Unknown Artist',
      duration: (result.durationMs || 0).toString(),
      url: this.buildTrackUrl(result.id),
      coverUrl: result.coverUri ? this.buildCoverUrl(result.coverUri) : '',
    };

    await this.tracksService.createTrack(toDtoTrack);

    return {
      tracks: [toDtoTrack as Track],
    };
  }

  async getTracksFromPlaylistYM(query: string) {
    //example uri:
    //https://music.yandex.ru/users/zhenya.tcheraev/playlists/3?utm_source=web&utm_medium=copy_link
    if (!query) return { tracks: [] };

    const uuid = query.split('users/')[1].split('/playlists')[0];
    const playlistId = query.split('playlists/')[1].split('?')[0];
    this.logger.log(`received uuid: ${uuid} and playlistId: ${playlistId}`);

    const response = (
      await this.yandexMusicClient.playlists.getPlaylistById(
        uuid as any,
        parseInt(playlistId),
      )
    ).result;

    if (!response) return { tracks: [] };

    const tracks = response.tracks.map((item) => item.track);
    const toDtoTracks = tracks
      .map((track) => {
        if (!track) return;
        return {
          trackId: track.realId,
          title: track.title,
          artist: track.artists[0]?.name || 'Unknown Artist',
          duration: (track.durationMs || 0).toString(),
          url: this.buildTrackUrl(track.id),
          coverUrl: track.coverUri ? this.buildCoverUrl(track.coverUri) : '',
        };
      })
      .filter((track): track is CreateTrackDto => track !== undefined);

    await this.tracksService.createTracks(toDtoTracks).then(() => {
      this.logger.debug('created tracks from playlist');
    });

    this.logger.debug('returned music');
    return {
      tracks: [...(toDtoTracks as Track[])],
      playlistName: response.title,
    };
  }

  async getTrackByIdYM(query: string) {
    //example uri:
    //https://music.yandex.ru/album/9216148/track/59916083?utm_source=web&utm_medium=copy_link
    if (!query) return { tracks: [] };

    const trackId = query.split('track/')[1].split('?')[0];
    this.logger.log(`Extracted trackId: ${trackId}`);

    const response = (
      await this.yandexMusicClient.tracks.getTracks({
        'track-ids': [trackId],
      })
    ).result[0];

    if (!response) return { tracks: [] };

    const toDtoTrack = {
      trackId: response.realId,
      title: response.title,
      artist: response.artists[0]?.name || 'Unknown Artist',
      duration: (response.durationMs || 0).toString(),
      url: this.buildTrackUrl(response.id),
      coverUrl: response.coverUri ? this.buildCoverUrl(response.coverUri) : '',
    };

    await this.tracksService.createTrack(toDtoTrack);

    return {
      tracks: [toDtoTrack as Track],
    };
  }

  async getTracksByIdsYM(querys: string[]) {
    if (!querys) return { tracks: [] };

    const ids = querys.map((query) => query.split('track/')[1].split('?')[0]);
    this.logger.log(`Fetching tracks by IDs: ${ids.join(', ')}`);

    const response = (
      await this.yandexMusicClient.tracks.getTracks({
        'track-ids': ids,
      })
    ).result.map((track) => track);
    if (!response) return { tracks: [] };

    const toDtoTracks = response
      .map((track) => {
        if (!track) return;
        return {
          trackId: track.realId,
          title: track.title,
          artist: track.artists[0]?.name || 'Unknown Artist',
          duration: (track.durationMs || 0).toString(),
          url: this.buildTrackUrl(track.id),
          coverUrl: track.coverUri ? this.buildCoverUrl(track.coverUri) : '',
        };
      })
      .filter((track): track is CreateTrackDto => track !== undefined);

    await this.tracksService.createTracks(toDtoTracks);

    return {
      tracks: [...(toDtoTracks as Track[])],
    };
  }

  async getTracksFromAlbumYM(query: string) {
    if (!query) return { tracks: [] };
    //example uri:
    //https://music.yandex.ru/album/28665939?utm_source=web&utm_medium=copy_link

    const albumId = query.split('album/')[1].split('?')[0];
    this.logger.log(`Extracted albumId: ${albumId}`);

    const response = (
      await this.yandexMusicClient.albums.getAlbumsWithTracks(parseInt(albumId))
    ).result.volumes;

    if (!response) return { tracks: [] };

    const toDtoTracks = response[0]
      .map((track) => {
        if (!track) return;
        return {
          trackId: track.realId,
          title: track.title,
          artist: track.artists[0]?.name || 'Unknown Artist',
          duration: (track.durationMs || 0).toString(),
          url: this.buildTrackUrl(track.id),
          coverUrl: track.coverUri ? this.buildCoverUrl(track.coverUri) : '',
        };
      })
      .filter((track): track is CreateTrackDto => track !== undefined);

    await this.tracksService.createTracks(toDtoTracks);
    return {
      tracks: [...(toDtoTracks as Track[])],
    };
  }

  async getTrackSourceYM(trackId: string) {
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const source = await getTrackUrl(this.yandexMusicClient, trackId);
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, 2000 * retries));
          this.logger.log(`Got track source ${trackId}`);
        }

        return { source };
      } catch (e: unknown) {
        retries++;
        this.logger.error(
          `Yandex Music API error (attempt ${retries}): ${e as string}`,
        );

        if (
          e &&
          typeof e === 'object' &&
          'statusCode' in e &&
          e.statusCode === 403
        ) {
          this.logger.error('Access denied, check API credentials');
          break;
        }

        if (retries === maxRetries) {
          throw new Error(
            `Yandex Music API unavailable after ${maxRetries} attempts`,
          );
        }
      }
    }
  }

  buildTrackUrl(trackId: string) {
    return `https://music.yandex.ru/track/${trackId}`;
  }

  buildCoverUrl(coverUri: string) {
    return `https://${coverUri.replace('%%', '400x400')}`;
  }
}
