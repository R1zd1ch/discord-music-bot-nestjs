import { Module } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { ConfigModule } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { YandexMusicModule } from 'src/yandex-music/yandex-music.module';
import { VoiceService } from './voice.service';
import { DiscordBotController } from './discord-bot.controller';

import { PlaylistModule } from 'src/playlist/playlist.module';
import { QueueModule } from 'src/queue/queue.module';
import { UserModule } from 'src/user/user.module';
import { PlaylistService } from 'src/playlist/playlist.service';
import { QueueService } from 'src/queue/queue.service';
import { UserService } from 'src/user/user.service';
import { TrackService } from 'src/track/track.service';
import { TrackModule } from 'src/track/track.module';
import { PlayerService } from './music-embed/player.service';

@Module({
  controllers: [DiscordBotController],
  imports: [
    ConfigModule,
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN!,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildInvites,
      ],
    }),
    YandexMusicModule,
    PlaylistModule,
    QueueModule,
    UserModule,
    TrackModule,
  ],
  providers: [
    DiscordBotService,
    VoiceService,
    PlaylistService,
    QueueService,
    UserService,
    TrackService,
    PlayerService,
  ],
})
export class DiscordBotModule {}
