import { Module } from '@nestjs/common';
import { SpotifyMusicService } from './spotify-music.service';
import * as Spotify from 'spotify-api.js';

@Module({
  providers: [SpotifyMusicService],
})
export class SpotifyMusicModule {}
