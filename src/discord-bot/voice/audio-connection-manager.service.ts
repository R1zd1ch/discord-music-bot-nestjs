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

@Injectable()
export class AudioConnectionManagerService {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private logger: Logger = new Logger(AudioConnectionManagerService.name);

  public async createConnection(
    guildId: string,
    channelId: string,
    adapterCreator: DiscordGatewayAdapterCreator,
  ) {
    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    this.connections.set(guildId, connection);

    const player = createAudioPlayer();
    connection.subscribe(player);

    this.players.set(guildId, player);

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
