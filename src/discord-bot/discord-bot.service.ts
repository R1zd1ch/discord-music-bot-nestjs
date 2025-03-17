import { Injectable, Logger } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  Context,
  ContextOf,
  On,
  Once,
  Options,
  SlashCommand,
  SlashCommandContext,
} from 'necord';
import { PlayDto } from './dtos/play.dto';
import { VoiceService } from './voice.service';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import { Client, GuildMember } from 'discord.js';
import { UserService } from 'src/user/user.service';
import { AudioPlayerStatus } from '@discordjs/voice';
import { LoopMode } from '@prisma/client';

@Injectable()
export class DiscordBotService {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly yandexMusicService: YandexMusicService,
    private readonly userService: UserService,
    private readonly client: Client,
  ) {}
  private readonly logger = new Logger(DiscordBotService.name);
  private readonly TIMEOUT = 1 * 60 * 1000;

  @SlashCommand({ name: 'ping', description: 'Pong!' })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!' });
  }
  @Once('ready') // Когда бот запустился
  onReady() {
    this.logger.log('🤖 Бот успешно запущен!');
  }

  @SlashCommand({
    name: 'play',
    description: 'Воспроизвести трек или плейлист',
  })
  async play(
    @Context() [interaction]: SlashCommandContext,
    @Options() { url }: PlayDto,
  ) {
    console.log(url);
    const member = interaction.member as GuildMember;
    const userId = interaction.user.id;
    await this.checkExistUser(userId);
    if (!(await this.checkUserInVoiceChannel([interaction]))) return;
    if (!member.voice.channel || !member.voice.channel.joinable) return;

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

  private async checkExistUser(discordId: string) {
    const user = await this.userService.getUser(discordId);
    if (!user) await this.userService.create(discordId);
  }

  @On('messageCreate')
  async onMessageCreate(@Context() [message]: ContextOf<'messageCreate'>) {
    console.log(message.embeds);
    if (message.author.bot) return;

    if (message.content === 'ping') {
      await message.reply('pong');
    }
  }

  @On('voiceStateUpdate')
  async onVoiceStateUpdate(@Context() [ctx]: ContextOf<'voiceStateUpdate'>) {
    const voiceChannel = ctx.channel;

    if (!voiceChannel) return;

    this.logger.debug(voiceChannel.id);

    if (
      voiceChannel.members.size === 1 &&
      voiceChannel.members.filter((member) => !member.user.bot).size === 0
    ) {
      this.logger.debug('checking');
      setTimeout(() => {
        const connection = this.voiceService.getConnection(
          voiceChannel.guildId,
        );

        if (connection) {
          this.voiceService.cleanup(voiceChannel.guildId);
          this.logger.debug(`🔇 Покидаем канал ${voiceChannel.id}`);
          return;
        }
      }, this.TIMEOUT);
    }

    await Promise.resolve();
  }

  @Button('prev')
  public async onPrevButton(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const user = interaction.user.username;
      const member = interaction.member;
      if (!user || !guildId || !member) return;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      await this.voiceService.prevTrack(guildId, [interaction]).finally(() => {
        interaction
          .editReply({
            content: `${user} переместился назад`,
          })
          .catch(() => {});
      });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при переключении назад!',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }

  @Button('next')
  public async onNextButton(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const user = interaction.user.username;
      const member = interaction.member;
      if (!user || !guildId || !member) return;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      await this.voiceService.nextTrack(guildId, [interaction]).finally(() => {
        interaction
          .editReply({
            content: `${user} пропустил трек`,
          })
          .catch(() => {});
      });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при переключении вперед!',
      });
    }
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }

  @Button('resume_pause')
  public async onPauseButton(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();
    try {
      const guildId = interaction.guildId;
      if (!guildId) return;
      const player = this.voiceService.getPlayer(guildId);
      const isPaused = player?.state.status === AudioPlayerStatus.Paused;

      await this.voiceService.togglePause(guildId, [interaction]);

      await interaction.followUp({
        content: isPaused ? '▶️ Воспроизведение' : '⏸ Пауза',
      });
    } catch {
      await interaction.followUp({
        content: '❌ Произошла ошибка при переключении вперед!',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }

  @Button('stopPlay')
  public async onStopButton(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const user = interaction.user.username;
      const member = interaction.member;

      if (!guildId || !user || !member) return;

      if (!(await this.checkUserInVoiceChannel([interaction]))) return;
      await this.voiceService.stop(guildId, [interaction]);

      await interaction.editReply({
        content: `${user} велел боту покинуть канал`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при отключении!',
      });
    }

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }

  @Button('repeat')
  public async onRepeatButton(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const guildId = interaction.guildId;
      const username = interaction.user.username;
      if (!guildId) return;
      if (!(await this.checkUserInVoiceChannel([interaction]))) return;

      const mode = await this.voiceService.setLoopMode(guildId, [interaction]);

      await interaction.editReply({
        content: `${username} ${mode ? 'включил' : 'выключил'} повтор`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при повторении трека!',
      });
    }
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }

  private async checkUserInVoiceChannel([interaction]: SlashCommandContext) {
    const member = interaction.member as GuildMember;
    if (!member || !member.voice.channel) {
      await interaction.reply({
        content: '❌ Вы должны быть в голосовом канале!',
        ephemeral: true,
      });
      return false;
    }
    return true;
  }
}
