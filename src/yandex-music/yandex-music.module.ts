import { Module } from '@nestjs/common';
import { YandexMusicService } from './yandex-music.service';
import { YandexMusicController } from './yandex-music.controller';
import { YandexMusicClient } from 'yandex-music-client';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackModule } from 'src/track/track.module';
import { TrackService } from 'src/track/track.service';

@Module({
  imports: [ConfigModule, TrackModule],
  controllers: [YandexMusicController],
  providers: [
    TrackService,
    YandexMusicService,
    {
      provide: YandexMusicClient,
      useFactory: (config: ConfigService) => {
        return new YandexMusicClient({
          BASE: 'https://api.music.yandex.net:443',
          HEADERS: {
            Authorization: `OAuth ${config.get('YANDEX_MUSIC_TOKEN')}`,
            'Accept-Language': 'ru-RU',
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [YandexMusicService],
})
export class YandexMusicModule {}
