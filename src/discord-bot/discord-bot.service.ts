import { Injectable, Logger } from '@nestjs/common';
import {
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
import { GuildMember, VoiceState } from 'discord.js';
import { UserService } from 'src/user/user.service';

@Injectable()
export class DiscordBotService {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly yandexMusicService: YandexMusicService,
    private readonly userService: UserService,
  ) {}
  private readonly logger = new Logger(DiscordBotService.name);
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
  async onVoiceStateUpdate(
    @Context() [voiceState]: ContextOf<'voiceStateUpdate'>,
  ) {
    // this.logger.debug(voiceState.member?.user.bot);
    // this.logger.debug(voiceState.member);
  }

  // @On('voiceStateUpdate')
  // async handleVoiceStatusUpdate(oldState: VoiceState, newState: VoiceState) {
  //   const voiceChannel = newState.channel || oldState.channel;
  //   if (!voiceChannel) return;

  //   const members = voiceChannel.members.filter((member) => !member.user.bot);
  //   const guildId = voiceChannel.guild.id;

  //   if (members.size === 0) {
  //     this.startInactivityTimer(voiceChannel.id, guildId);
  //   } else {
  //     this.clearInactivityTimer(voiceChannel.id);
  //   }
  // }

  // private startInactivityTimer(channelId: string, guildId: string) {
  //   if (this.inactivityTimers.has(channelId)) return;

  //   this.logger.log(`🕒 Таймер на 10 минут запущен для ${channelId}`);

  //   const timeout = setTimeout(
  //     async () => {
  //       const channel = await ;
  //       if (channel?.isVoiceBased()) {
  //         const voiceChannel = channel as any;
  //         const members = voiceChannel.members.filter(
  //           (member) => !member.user.bot,
  //         );

  //         if (members.size === 0) {
  //           this.logger.log(
  //             `🔇 Покидаем канал ${channelId} (гильдия ${guildId})`,
  //           );
  //           voiceChannel.leave();
  //         }
  //       }
  //       this.inactivityTimers.delete(channelId);
  //     },
  //     10 * 60 * 1000,
  //   ); // 10 минут

  //   this.inactivityTimers.set(channelId, timeout);
  // }
  // private clearInactivityTimer(channelId: string) {
  //   if (this.inactivityTimers.has(channelId)) {
  //     clearTimeout(this.inactivityTimers.get(channelId));
  //     this.inactivityTimers.delete(channelId);
  //     this.logger.log(`✅ Таймер сброшен для ${channelId}`);
  //   }
  // }
}
