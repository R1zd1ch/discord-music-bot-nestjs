import { Injectable, Logger } from '@nestjs/common';
import { Track, YandexMusicClient } from 'yandex-music-client';
import { getTrackUrl } from 'yandex-music-client/trackUrl';
import { ResponseTrackType } from './types/response-track.type';

@Injectable()
export class YandexMusicService {
  private logger = new Logger(YandexMusicService.name);
  constructor(private readonly yandexMusicClient: YandexMusicClient) {}

  async searchYM(query: string) {
    if (!query) return [];

    this.logger.log(`Received search query: ${query}`);

    switch (true) {
      case query.includes('users/') && query.includes('playlists/'):
        return this.getTracksFromPlaylistYM(query);

      case query.includes('album/') && query.includes('track/'):
        return this.getTrackByIdYM(query);

      case query.includes('album/'):
        return this.getTracksFromAlbumYM(query);

      default:
        throw new Error('Unsupported search format');
    }
  }

  async getTracksFromPlaylistYM(query: string) {
    //example uri:
    //https://music.yandex.ru/users/zhenya.tcheraev/playlists/3?utm_source=web&utm_medium=copy_link
    if (!query) return [];

    const uuid = query.split('users/')[1].split('/playlists')[0];
    const playlistId = query.split('playlists/')[1].split('?')[0];
    this.logger.log(`received uuid: ${uuid} and playlistId: ${playlistId}`);

    const response = (
      await this.yandexMusicClient.playlists.getPlaylistById(
        uuid,
        parseInt(playlistId),
      )
    ).result.tracks;

    const tracks = response.map((item) => item.track);

    return tracks;
  }

  async getTrackByIdYM(query: string) {
    //example uri:
    //https://music.yandex.ru/album/9216148/track/59916083?utm_source=web&utm_medium=copy_link

    const trackId = query.split('track/')[1].split('?')[0];
    this.logger.log(`Extracted trackId: ${trackId}`);

    const result = (
      await this.yandexMusicClient.tracks.getTracks({
        'track-ids': [trackId],
      })
    ).result[0];

    return [result];
  }

  async getTracksByIdsYM(querys: string[]) {
    if (!querys) return [];

    const ids = querys.map((query) => query.split('track/')[1].split('?')[0]);
    this.logger.log(`Fetching tracks by IDs: ${ids.join(', ')}`);

    const response = (
      await this.yandexMusicClient.tracks.getTracks({
        'track-ids': ids,
      })
    ).result.map((track) => track);

    return response;
  }

  async getTracksFromAlbumYM(query: string) {
    if (!query) return [];
    //example uri:
    //https://music.yandex.ru/album/28665939?utm_source=web&utm_medium=copy_link

    const albumId = query.split('album/')[1].split('?')[0];
    this.logger.log(`Extracted albumId: ${albumId}`);

    const response = (
      await this.yandexMusicClient.albums.getAlbumsWithTracks(parseInt(albumId))
    ).result.volumes;

    if (!response) return [];

    return response[0];
  }

  async getTrackSourceYM(trackId: string) {
    const source = await getTrackUrl(this.yandexMusicClient, trackId);
    return {
      source,
    };
  }

  async makeResponse(track: Track): Promise<ResponseTrackType> {
    return {
      trackId: track.id,
      title: track.title,
      duration: track.durationMs,
      ...(await this.getTrackSourceYM(track.id)),
      coverUri: track.coverUri.replace('%%', '400x400'),
      filePath: '',
    };
  }
}
