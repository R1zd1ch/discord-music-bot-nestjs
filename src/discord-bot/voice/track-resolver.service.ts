import { Injectable } from '@nestjs/common';
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
}
