import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { VoiceService } from '../voice.service';

@Injectable()
export class MusicControls {
  constructor(private readonly voiceService: VoiceService) {}

  @Button('pause')
  async pause(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    await this.voiceService.togglePause(guildId, [interaction]);
  }

  @Button('resume')
  async resume(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    await this.voiceService.togglePause(guildId, [interaction]);
  }

  @Button('skip')
  async skip(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    await this.voiceService.skip(guildId, [interaction]);
  }

  @Button('skipAll')
  async skipAll(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    await this.voiceService.skipAll(guildId, [interaction]);
  }

  @Button('shuffle')
  async shuffle(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    console.log(guildId, channelId);
  }

  @Button('repeat')
  async repeat(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    console.log(guildId, channelId);
  }

  @Button('queue')
  async queue(@Context() [interaction]: ButtonContext) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    console.log(guildId, channelId);
  }
}
