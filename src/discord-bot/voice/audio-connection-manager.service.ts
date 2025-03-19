import {
  AudioPlayer,
  createAudioPlayer,
  DiscordGatewayAdapterCreator,
  entersState,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from 'src/queue/queue.service';

@Injectable()
export class AudioConnectionManagerService {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private logger: Logger = new Logger(AudioConnectionManagerService.name);

  constructor(private readonly queueService: QueueService) {}

  public async createConnection(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
  ) {
    let connection = this.getConnection(guildId);
    let player = this.getPlayer(guildId);
    if (!connection) {
      this.logger.debug(
        `Joining voice channel ${channelId} in guild ${guildId}`,
      );
      connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
      });
      this.connections.set(guildId, connection);
      await this.queueService.clearQueue(guildId);
    }

    if (!player) {
      player = createAudioPlayer();
      connection.subscribe(player);
      this.players.set(guildId, player);
    }
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

    return { connection, player };
  }

  public getConnection(guildId: string) {
    return this.connections.get(guildId);
  }

  public getPlayer(guildId: string) {
    return this.players.get(guildId);
  }

  public cleanupConnections(guildId: string) {
    this.getPlayer(guildId)?.stop();
    this.getConnection(guildId)?.destroy();

    this.connections.delete(guildId);
    this.players.delete(guildId);
  }
}
