import { Injectable, Logger } from '@nestjs/common';
import { YandexMusicClient } from 'yandex-music-client';
import { getTrackUrl } from 'yandex-music-client/trackUrl';
import { TrackService } from 'src/track/track.service';
import { CreateTrackDto } from 'src/track/dtos/create-track.dto';

@Injectable()
export class YandexMusicService {
  private logger = new Logger(YandexMusicService.name);
  constructor(
    private readonly yandexMusicClient: YandexMusicClient,
    private readonly tracksService: TrackService,
  ) {}

  async searchYM(query: string) {
    if (!query) return { tracks: [] };

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
    if (!query) return { tracks: [] };

    const uuid = query.split('users/')[1].split('/playlists')[0];
    const playlistId = query.split('playlists/')[1].split('?')[0];
    this.logger.log(`received uuid: ${uuid} and playlistId: ${playlistId}`);

    const response = (
      await this.yandexMusicClient.playlists.getPlaylistById(
        uuid,
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

    const addedToDb = await this.tracksService.createTracks(toDtoTracks);

    return {
      tracks: [...addedToDb],
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

    const addedToDb = await this.tracksService.createTrack(toDtoTrack);

    return {
      tracks: [addedToDb],
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

    const addedToDb = await this.tracksService.createTracks(toDtoTracks);

    return {
      tracks: [...addedToDb],
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

    const addedToDb = await this.tracksService.createTracks(toDtoTracks);
    return {
      tracks: [...addedToDb],
    };
  }

  async getTrackSourceYM(trackId: string) {
    const source = await getTrackUrl(this.yandexMusicClient, trackId);
    return {
      source,
    };
  }

  buildTrackUrl(trackId: string) {
    return `https://music.yandex.ru/track/${trackId}`;
  }

  buildCoverUrl(coverUri: string) {
    return `https://${coverUri.replace('%%', '400x400')}`;
  }
}
