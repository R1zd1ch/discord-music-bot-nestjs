import { Injectable } from '@nestjs/common';
import { Track } from '@prisma/client';
import { SlashCommandContext } from 'necord';
import { PlaylistService } from 'src/playlist/playlist.service';
import { QueueService } from 'src/queue/queue.service';
import { TrackService } from 'src/track/track.service';

@Injectable()
export class QueueManagerService {
  constructor(
    private readonly queueService: QueueService,
    private readonly playlistService: PlaylistService,
    private readonly trackService: TrackService,
  ) {}

  async handleSearchResult(
    guildId: string,
    userId: string,
    result: {
      tracks: Track[];
      playlistName?: string;
    },
    // eslint-disable-next-line
    [interaction]: SlashCommandContext,
  ) {
    if (result.tracks.length > 1 && result.playlistName) {
      await this.handlePlaylist(guildId, userId, {
        tracks: result.tracks,
        playlistName: result.playlistName,
      });
    } else {
      await this.queueService.addTracksToQueue(
        guildId,
        result.tracks.map((track) => track.trackId),
      );
    }
    return;
  }

  private async handlePlaylist(
    guildId: string,
    userId: string,
    result: {
      tracks: Track[];
      playlistName: string;
    },
  ) {
    let playlist = await this.playlistService.findByName(
      userId,
      result.playlistName,
    );

    if (!playlist) {
      playlist = await this.playlistService.createPlaylist(
        userId,
        result.playlistName,
      );
    }

    await this.playlistService.addTracksToPlaylist(playlist.id, result.tracks);
    await this.queueService.addPlaylistToQueue(guildId, playlist.id);
    return;
  }
}
