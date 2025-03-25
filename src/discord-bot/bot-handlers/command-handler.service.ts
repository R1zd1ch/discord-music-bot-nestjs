import { Injectable, Logger } from '@nestjs/common';
import { VoiceService } from '../voice/voice.service';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { PlayDto } from '../dtos/play.dto';
import { GuildMember } from 'discord.js';
import { UserService } from 'src/user/user.service';
import { AudioConnectionManagerService } from '../voice/audio-connection-manager.service';
import { helpComponent } from '../player/help.embed';

@Injectable()
export class CommandHandlerService {
  private readonly logger = new Logger(CommandHandlerService.name);
  private readonly TIME_TO_DELETE_MESSAGE = 1 * 10 * 1000;
  constructor(
    private readonly voiceService: VoiceService,
    private readonly userService: UserService,
    private readonly connectionManager: AudioConnectionManagerService,
  ) {}

  @SlashCommand({ name: 'ping', description: 'pong!!!' })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply({
      content: 'pong',
    });

    setTimeout(() => {
      interaction
        .editReply({
          content: `Задержка АПИ: ${Math.round(interaction.client.ws.ping)} ms \n Задержка Бота: ${Date.now() - interaction.createdTimestamp - 5000} ms`,
        })
        .catch(() => {});
    }, 5 * 1000);

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  @SlashCommand({
    name: 'play',
    description: 'Воспроизвести трек или плейлист',
  })
  async play(
    @Context() [interaction]: SlashCommandContext,
    @Options() { url }: PlayDto,
  ) {
    this.logger.debug(`recived url: ${url}`);
    const member = interaction.member as GuildMember;
    const userId = interaction.user.id;

    await this.checkExistUser(userId);

    if (!(await this.checkUserInVoiceChannel([interaction], true))) return;

    if (!member.voice.channel || !member.voice.channel.joinable) {
      return interaction.reply({
        content:
          '❌ Вы должны быть в голосовом канале, чтобы использовать команды!',
        ephemeral: true,
      });
    }
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Не удалось получить информацию о сервере!',
        ephemeral: true,
      });
    }

    await this.voiceService.playAudio(
      interaction.guild.id,
      member.voice.channel.id,
      interaction.guild.voiceAdapterCreator,
      interaction.user.id,
      url,
      [interaction],
    );
  }

  @SlashCommand({
    name: 'shuffle',
    description: 'Перемешать очередь',
  })
  async shuffle(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member as GuildMember;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        return interaction.reply({
          content: '❌ Не удалось получить информацию о сервере!',
          ephemeral: true,
        });
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

  @SlashCommand({
    name: 'stop',
    description: 'Остановить воспроизведение',
  })
  async stop(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      const member = interaction.member as GuildMember;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      if (!guildId || !username || !member) {
        return interaction.reply({
          content: '❌ Не удалось получить информацию о сервере!',
          ephemeral: true,
        });
      }

      await this.voiceService
        .handleControl(guildId, 'stop', [interaction])
        .finally(() => {
          interaction
            .editReply({
              content: `${username} остановил воспроизведение`,
            })
            .catch(() => {});
        });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при обработке команды остановки',
      });
    }
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }
  private async checkExistUser(discordId: string) {
    const user = await this.userService.getUser(discordId);
    if (!user) await this.userService.create(discordId);
  }

  @SlashCommand({
    name: 'help',
    description: 'Помощь',
  })
  async help(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });
    try {
      await interaction.editReply({
        embeds: [helpComponent()],
      });
    } catch (error) {
      this.logger.error('Ошибка при отправке справки:', error);
      await interaction.editReply({
        content: '❌ Произошла ошибка при отправке справки',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }
  private async checkUserInVoiceChannel(
    [interaction]: SlashCommandContext,
    isPlay = false,
  ) {
    const guildId = interaction.guildId;
    const member = interaction.member as GuildMember;
    const bot = interaction.guild?.members.me;
    if (!guildId) return;
    const connection = this.connectionManager.getConnection(guildId);

    if (!member?.voice?.channel) {
      const message = await interaction.reply({
        content:
          '❌ Вы должны быть в голосовом канале, чтобы использовать команды!',
        ephemeral: true,
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    if (!connection && isPlay) return true;

    if (!bot?.voice?.channel) {
      const message = await interaction.reply({
        content: '❌ Бот не находится в голосовом канале!',
        ephemeral: true,
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    if (member.voice.channelId !== bot.voice.channelId) {
      const message = await interaction.reply({
        content: '❌ Вы должны находиться в одном голосовом канале с ботом!',
        ephemeral: true,
      });
      setTimeout(() => {
        message.delete().catch(() => {});
      }, this.TIME_TO_DELETE_MESSAGE);
      return false;
    }

    return true;
  }
}
