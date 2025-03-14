import { Module } from '@nestjs/common';

import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { YandexMusicModule } from './yandex-music/yandex-music.module';
import { DiscordBotModule } from './discord-bot/discord-bot.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { PlaylistModule } from './playlist/playlist.module';
import { UserModule } from './user/user.module';
import { TrackModule } from './track/track.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    YandexMusicModule,
    DiscordBotModule,
    PrismaModule,
    QueueModule,
    PlaylistModule,
    UserModule,
    TrackModule,
  ],
  providers: [AppService],
})
export class AppModule {}
