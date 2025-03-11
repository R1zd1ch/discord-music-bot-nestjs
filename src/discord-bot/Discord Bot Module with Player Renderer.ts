import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { YandexMusicModule } from 'src/yandex-music/yandex-music.module';
import { MusicControls } from './music-embed/music-controls.service';
import { PlayerRendererService } from './music-embed/player-renderer.service';

@Module({
  imports: [YandexMusicModule],
  providers: [VoiceService, MusicControls, PlayerRendererService],
  exports: [VoiceService],
})
export class DiscordBotModule {}
