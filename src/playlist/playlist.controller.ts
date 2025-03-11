import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PlaylistService } from './playlist.service';

@Controller('playlist')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Post()
  async createPlaylist(
    @Body('userId') userId: string,
    @Body('name') name: string,
  ) {
    return this.playlistService.createPlaylist(userId, name);
  }

  @Get(':userId')
  async getPlaylists(@Param('userId') userId: string) {
    return this.playlistService.getPlaylists(userId);
  }

  @Post(':playlistId/tracks')
  async addTrackToPlaylist(
    @Param('playlistId') playlistId: string,
    @Body('trackId') trackId: string,
  ) {
    return this.playlistService.addTrackToPlaylist(playlistId, trackId);
  }
}
