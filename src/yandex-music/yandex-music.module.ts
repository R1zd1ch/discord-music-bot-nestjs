import { Module } from '@nestjs/common';
import { YandexMusicService } from './yandex-music.service';
import { YandexMusicController } from './yandex-music.controller';
import { YandexMusicClient } from 'yandex-music-client';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [YandexMusicController],
  providers: [
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
