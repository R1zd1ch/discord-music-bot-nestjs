import { Injectable, Logger } from '@nestjs/common';
import { VoiceService } from '../voice/voice.service';
import { Button, Context, SlashCommandContext } from 'necord';
import { GuildMember } from 'discord.js';
import { AudioConnectionManagerService } from '../voice/audio-connection-manager.service';
import { AudioPlayerStatus } from '@discordjs/voice';

@Injectable()
export class ButtonHandlerService {
  private readonly logger = new Logger(ButtonHandlerService.name);
  private readonly TIME_TO_DELETE_MESSAGE = 1 * 10 * 1000;
  constructor(
    private readonly voiceService: VoiceService,
    private readonly connectionManager: AudioConnectionManagerService,
  ) {}

  @Button('prev')
  public async prev(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member as GuildMember;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      await this.voiceService
        .handleControl(guildId, 'prev', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} переместился назад`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды предыдущего трека',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('next')
  public async next(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member as GuildMember;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      await this.voiceService
        .handleControl(guildId, 'next', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} переместился вперед`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды следующего трека',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('resume_pause')
  public async resumePause(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({});

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member as GuildMember;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      const player = this.connectionManager.getPlayer(guildId);
      const isPaused = player?.state.status === AudioPlayerStatus.Paused;
      const newState = !isPaused;

      if (!player) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });

        return;
      }

      this.logger.debug(
        `setting player status to ${newState ? 'Paused' : 'Playing'} in player ${guildId}`,
      );

      await this.voiceService.handleControl(guildId, 'resume_pause', [
        interaction,
      ]);

      await interaction.editReply({
        content: newState ? '⏸ Пауза' : '▶️ Воспроизведение',
      });
    } catch {
      await interaction.editReply({
        content:
          '❌ Произошла ошибка при обработке команды продолжения/паузы воспроизведения',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('stop')
  public async stop(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      await this.voiceService
        .handleControl(guildId, 'stop', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} велел боту ливнуть с позором с голосового канала (тот кто заставил напёрдышь)`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content:
          '❌ Произошла ошибка при обработке команды остановки воспроизведения',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('repeat')
  public async repeat(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      await this.voiceService
        .handleControl(guildId, 'loop', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} включил повторение текущего трека`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды повтора трека',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('skipItem')
  public async skipItem(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }

      await this.voiceService
        .handleControl(guildId, 'skipItem', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} пропустил элемент очереди`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content:
          '❌ Произошла ошибка при обработке команды пропуска элемента очереди',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  private async checkUserInVoiceChannel([interaction]: SlashCommandContext) {
    const member = interaction.member as GuildMember;
    if (!member || !member.voice.channel) {
      await interaction.reply({
        content:
          '❌ Вы должны быть в голосовом канале, чтобы использовать кнопки!',
        ephemeral: true,
      });
      return false;
    }
    return true;
  }
}
