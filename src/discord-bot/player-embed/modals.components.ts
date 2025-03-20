import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export function changeVolumeModal() {
  return new ModalBuilder()
    .setTitle('Изменить громкость')
    .setCustomId('changeVolume')
    .setComponents([
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('volume_input')
          .setLabel('Введите уровень громкости (0-100)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Например: 50')
          .setRequired(true),
      ),
    ]);
}
