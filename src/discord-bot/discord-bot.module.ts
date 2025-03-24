import { Module } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { ConfigModule } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { YandexMusicModule } from 'src/yandex-music/yandex-music.module';
import { VoiceService } from './voice/voice.service';
import { NecordPaginationModule } from '@necord/pagination';
import { PlaylistModule } from 'src/playlist/playlist.module';
import { QueueModule } from 'src/queue/queue.module';
import { UserModule } from 'src/user/user.module';
import { PlaylistService } from 'src/playlist/playlist.service';
import { QueueService } from 'src/queue/queue.service';
import { UserService } from 'src/user/user.service';
import { TrackService } from 'src/track/track.service';
import { TrackModule } from 'src/track/track.module';
import { PlayerService } from './player/player.service';
import { AudioConnectionManagerService } from './voice/audio-connection-manager.service';
import { PlayerInteractionService } from './voice/player-interaction.service';
import { QueueManagerService } from './voice/queue-manager.service';
import { QueueProcessorService } from './voice/queue-processor.service';
import { TrackCacheService } from './voice/track-cache.service';
import { TrackResolverService } from './voice/track-resolver.service';
import { CommandHandlerService } from './bot-handlers/command-handler.service';
import { EventHandlerService } from './bot-handlers/event-handler.service';
import { ButtonHandlerService } from './bot-handlers/button-handler.service';
import { ModalHandlerService } from './bot-handlers/modal-handler.service';
import { QueuePaginationService } from './player/queue-pagination.service';

@Module({
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
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMembers,
      ],
    }),
    NecordPaginationModule.forRoot({
      buttons: {
        first: { emoji: '', label: '⏮️' },
        back: { emoji: '', label: '◀️' },
        next: { emoji: '', label: '▶️' },
        last: { emoji: '', label: '⏭️' },
      },
      allowSkip: true,
      allowTraversal: false,
      buttonsPosition: 'end',
    }),
    YandexMusicModule,
    PlaylistModule,
    QueueModule,
    UserModule,
    TrackModule,
  ],
  providers: [
    VoiceService,
    DiscordBotService,
    PlaylistService,
    QueueService,
    UserService,
    TrackService,
    PlayerService,
    AudioConnectionManagerService,
    PlayerInteractionService,
    QueueManagerService,
    QueueProcessorService,
    TrackCacheService,
    TrackResolverService,
    CommandHandlerService,
    EventHandlerService,
    ButtonHandlerService,
    ModalHandlerService,
    QueuePaginationService,
  ],
})
export class DiscordBotModule {}
