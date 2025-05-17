import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { AudioConnectionManagerService } from '../voice/audio-connection-manager.service';

@Injectable()
export class EventHandlerService {
  private readonly logger = new Logger(EventHandlerService.name);
  private readonly TIME_TO_LEAVE_VOICE_CHANNEL = 3 * 60 * 1000;
  constructor(
    private readonly connectionsManager: AudioConnectionManagerService,
  ) {}

  @On('voiceStateUpdate')
  async onVoiceStateUpdate(@Context() [ctx]: ContextOf<'voiceStateUpdate'>) {
    const voiceChannel = ctx.channel;
    if (!voiceChannel) return;

    this.logger.debug(`voiceStateUpdated in ${voiceChannel.name}`);

    if (
      voiceChannel.members.size === 1 &&
      voiceChannel.members.filter((member) => !member.user.bot).size === 0
    ) {
      this.logger.debug(`check voiceStateUpdate in ${voiceChannel.name}`);
      setTimeout(() => {
        if (
          voiceChannel.members.size === 1 &&
          voiceChannel.members.filter((member) => !member.user.bot).size === 0
        ) {
          const connection = this.connectionsManager.getConnection(
            voiceChannel.guild.id,
          );

          if (connection) {
            this.connectionsManager.cleanupConnections(voiceChannel.guild.id);
            this.logger.debug(`Leaving ${voiceChannel.name}`);
          }
        }
      }, this.TIME_TO_LEAVE_VOICE_CHANNEL);
    }

    await Promise.resolve();
  }
}
