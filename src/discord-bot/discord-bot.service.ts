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
  private inactivityTimers = new Map<string, NodeJS.Timeout>();
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
    if (!member || !member.voice.channel) {
      return interaction.reply({
        content: '❌ Вы должны быть в голосовом канале!',
        ephemeral: true,
      });
    }
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Не удалось получить информацию о сервере!',
        ephemeral: true,
      });
    }

    console.log(
      interaction.guild.id,
      member.voice.channel.id,
      interaction.guild.voiceAdapterCreator,
      interaction.user.id,
      url,
    );

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
    const guildId = interaction.guildId;

    if (!guildId) return;

    await this.voiceService.prevTrack(guildId, [interaction]);
    await interaction.reply({ content: 'Bebra' });
  }

  @Button('next')
  public async onNextButton(@Context() [interaction]: SlashCommandContext) {
    const guildId = interaction.guildId;
    const user = interaction.user.username;

    if (!user || !guildId) return;

    await this.voiceService.nextTrack(guildId, [interaction]);
    const message = await interaction.reply({
      content: `${user} пропустил трек`,
    });
    setTimeout(() => {
      message.delete();
    }, 2000);
  }

  @Button('resume_pause')
  public async onPauseButton(@Context() [interaction]: SlashCommandContext) {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const player = this.voiceService.getPlayer(guildId);
    const isPaused = player?.state.status === AudioPlayerStatus.Paused;

    await this.voiceService.togglePause(guildId, [interaction]);

    await interaction.deferReply();
    const message = await interaction.followUp({
      content: isPaused ? '▶️ Воспроизведение' : '⏸ Пауза',
    });

    setTimeout(() => {
      message.delete();
    }, 2000);
  }

  @Button('stopPlay')
  public async onStopButton(@Context() [interaction]: SlashCommandContext) {
    const guildId = interaction.guildId;
    if (!guildId) return;
    await this.voiceService.stop(guildId, [interaction]);
  }
}
