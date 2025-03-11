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
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';

@Injectable()
export class DiscordBotService {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly yandexMusicService: YandexMusicService,
  ) {}
  private readonly logger = new Logger(DiscordBotService.name);
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

    await interaction.deferReply();

    await this.voiceService.playAudio(
      interaction.guild.id,
      member.voice.channel.id,
      interaction.guild.voiceAdapterCreator,
      url,
      [interaction],
    );
  }

  @On('voiceChannelLeave') // Когда пользователь покинул голосовой канал
  async onVoiceChannelLeave(
    @Context() [interaction]: ContextOf<'voiceChannelLeave'>,
  ) {
    console.log(interaction.user.username);
  }
}
