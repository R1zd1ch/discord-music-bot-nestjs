import { Body, Controller, Get } from '@nestjs/common';
import { YandexMusicService } from './yandex-music.service';

@Controller('yandex-music')
export class YandexMusicController {
  constructor(private readonly yandexMusicService: YandexMusicService) {}

  @Get()
  async searchYM(@Body('query') query: string) {
    return await this.yandexMusicService.searchYM(query);
  }

  @Get('playlist')
  async getTracksFromPlaylistYM(@Body('query') query: string) {
    return await this.yandexMusicService.getTracksFromPlaylistYM(query);
  }

  @Get('track')
  async getTrackByIdYM(@Body('query') query: string) {
    return await this.yandexMusicService.getTrackByIdYM(query);
  }

  @Get('tracks')
  async getTracksByIdsYM(@Body('ids') ids: string[]) {
    return await this.yandexMusicService.getTracksByIdsYM(ids);
  }

  @Get('album')
  async getTracksFromAlbumYM(@Body('query') query: string) {
    return await this.yandexMusicService.getTracksFromAlbumYM(query);
  }
}
