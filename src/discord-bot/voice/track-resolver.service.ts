import { Injectable } from '@nestjs/common';
import { QueueItem, QueueItemType, Track } from '@prisma/client';
import { PlaylistService } from 'src/playlist/playlist.service';
import { QueueService } from 'src/queue/queue.service';
import { TrackService } from 'src/track/track.service';

@Injectable()
export class TrackResolverService {
  constructor(
    private readonly playlistService: PlaylistService,
    private readonly queueService: QueueService,
    private readonly trackService: TrackService,
  ) {}

  public async resolveTrack(item: QueueItem): Promise<Track | null> {
    if (item.type === QueueItemType.TRACK) {
      return this.resolveSingleTrack(item);
    }
    return this.resolvePlaylistTrack(item);
  }

  private async resolveSingleTrack(item: QueueItem) {
    if (!item.trackId) return null;
    try {
      const track = await this.trackService.getTrack(item.trackId);
      return track ? track : null;
    } catch {
      return null;
    }
  }

  private async resolvePlaylistTrack(item: QueueItem): Promise<Track | null> {
    if (!item.playlistId) return null;

    const playlist = await this.playlistService.getTracksFromPlaylist(
      item.playlistId,
    );

    if (!playlist.length || item.currentIndex >= playlist.length) {
      await this.queueService.removeItemFromQueue(item.id);
      return null;
    }
    //eslint-disable-next-line
    const track = playlist[item.currentIndex]?.track;
    //eslint-disable-next-line
    return track ? track : this.hanldeInvalidTrack(item);
  }

  private async hanldeInvalidTrack(item: QueueItem): Promise<null> {
    await this.queueService.removeItemFromQueue(item.id);
    return null;
  }
}
