import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default function buttonsComponents(isPaused: boolean) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${isPaused ? 'resume' : 'pause'}`)
        .setLabel(`${isPaused ? '▶️' : '⏸️'}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('skip')
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('skipAll')
        .setLabel('⏩')
        .setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('shuffle')
        .setLabel('🔀')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('repeat')
        .setLabel('🔁')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('📜')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}
