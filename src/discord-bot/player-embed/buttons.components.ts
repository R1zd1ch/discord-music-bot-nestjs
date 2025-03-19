import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default function buttonsComponents(isPaused: boolean) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('resume_pause')
        .setLabel(`${isPaused ? '▶️' : '⏸️'}`)
        .setStyle(isPaused ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('stop')
        .setLabel('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('skipItem')
        .setLabel('⏩')
        .setStyle(ButtonStyle.Primary),
    ),

    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('repeat')
        .setLabel('🔁')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('shuffle')
        .setLabel('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help')
        .setLabel('❓')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('volume')
        .setLabel('🔊')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}
