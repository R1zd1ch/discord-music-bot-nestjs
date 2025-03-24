import { Injectable, Logger } from '@nestjs/common';
import { VoiceService } from '../voice/voice.service';
import { Button, Context, SlashCommandContext } from 'necord';
import { GuildMember } from 'discord.js';
import { AudioConnectionManagerService } from '../voice/audio-connection-manager.service';
import { AudioPlayerStatus } from '@discordjs/voice';
import { changeVolumeModal } from '../player/modals.components';
import { NecordPaginationService } from '@necord/pagination';
import { QueuePaginationService } from '../player/queue-pagination.service';
import { helpComponent } from '../player/help.embed';

@Injectable()
export class ButtonHandlerService {
  private readonly logger = new Logger(ButtonHandlerService.name);
  private readonly TIME_TO_DELETE_MESSAGE = 1 * 10 * 1000;
  constructor(
    private readonly voiceService: VoiceService,
    private readonly connectionManager: AudioConnectionManagerService,
    private readonly paginationService: NecordPaginationService,
    private readonly queuePaginationService: QueuePaginationService,
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

  @Button('resume_pause')
  public async resumePause(@Context() [interaction]: SlashCommandContext) {
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
      const channelId = interaction.channelId;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member || !channelId) {
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
              content: `${username} велел боту ливнуть с позором с голосового канала`,
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

  @Button('shuffle')
  public async shuffle(@Context() [interaction]: SlashCommandContext) {
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
        .handleControl(guildId, 'shuffle', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} перемешал очередь`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды перемешивания',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @Button('queue')
  async queue(@Context() [interaction]: SlashCommandContext) {
    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        await interaction.reply({
          content: '❌ Произошла ошибка при обработке команды',
          ephemeral: true,
        });
        return;
      }

      await this.queuePaginationService.testPagination([interaction]);
    } catch {
      await interaction.reply({
        content: '❌ Произошла ошибка при обработке команды очереди',
        ephemeral: true,
      });
    }

    setTimeout(
      () => {
        interaction.deleteReply().catch(() => {});
      },
      this.TIME_TO_DELETE_MESSAGE + 1.5 * 60 * 1000,
    );
  }

  @Button('help')
  async help(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const guildId = interaction.guildId;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !member) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при обработке команды',
        });
        return;
      }
      await interaction.editReply({
        embeds: [helpComponent()],
      });
      // await this.voiceService.handleControl(guildId, 'help', [interaction]);
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды помощи',
      });
    }

    setTimeout(
      () => {
        interaction.deleteReply().catch(() => {});
      },
      this.TIME_TO_DELETE_MESSAGE + 1.5 * 60 * 1000,
    );
  }

  @Button('volume')
  async changeVolume(@Context() [interaction]: SlashCommandContext) {
    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        const message = await interaction.reply({
          content: '❌ Произошла ошибка при обработке команды',
          ephemeral: true,
        });

        setTimeout(() => {
          message.delete().catch(() => {});
        }, this.TIME_TO_DELETE_MESSAGE);
        return;
      }

      const modal = changeVolumeModal();

      await interaction.showModal(modal).catch(() => {});
    } catch {
      const message = await interaction.reply({
        content:
          '❌ Произошла ошибка при обработке команды изменения громкости',
        ephemeral: true,
      });

      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
    }
  }

  private async checkUserInVoiceChannel([interaction]: SlashCommandContext) {
    const member = interaction.member as GuildMember;
    const bot = interaction.guild?.members.me; // Получаем бота в гильдии

    if (!member?.voice?.channel) {
      const message = await interaction.editReply({
        content:
          '❌ Вы должны быть в голосовом канале, чтобы использовать кнопки!',
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    if (!bot?.voice?.channel) {
      const message = await interaction.editReply({
        content: '❌ Бот не находится в голосовом канале!',
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    if (member.voice.channelId !== bot.voice.channelId) {
      const message = await interaction.editReply({
        content: '❌ Вы должны находиться в одном голосовом канале с ботом!',
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    return true;
  }
}
