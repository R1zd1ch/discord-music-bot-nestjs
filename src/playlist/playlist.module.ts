import { Module } from '@nestjs/common';
import { PlaylistService } from './playlist.service';

@Module({
  providers: [PlaylistService],
})
export class PlaylistModule {}
