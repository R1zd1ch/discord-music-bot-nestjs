import { Injectable, Logger } from '@nestjs/common';
import { VoiceService } from '../voice/voice.service';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { PlayDto } from '../dtos/play.dto';
import { GuildMember } from 'discord.js';
import { UserService } from 'src/user/user.service';

@Injectable()
export class CommandHandlerService {
  private readonly logger = new Logger(CommandHandlerService.name);
  constructor(
    private readonly voiceService: VoiceService,
    private readonly userService: UserService,
  ) {}

  @SlashCommand({ name: 'ping', description: 'pong!!!' })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return await interaction.reply('pong!');
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

  private async checkExistUser(discordId: string) {
    const user = await this.userService.getUser(discordId);
    if (!user) await this.userService.create(discordId);
  }
}
