import { Controller } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Controller()
export class DiscordBotController {
  @SlashCommand({
    name: 'ping',
    description: 'pong',
  })
  public async ping(@Context() [interaction]: SlashCommandContext) {
    console.log(interaction.member);
    return interaction.reply({ content: 'Pong!' });
  }
}
