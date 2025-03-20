import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Modal, ModalContext, SlashCommandContext } from 'necord';
import { VoiceService } from '../voice/voice.service';

@Injectable()
export class ModalHandlerService {
  private readonly logger = new Logger(ModalHandlerService.name);
  private readonly TIME_TO_DELETE_MESSAGE = 1 * 10 * 1000;

  constructor(private readonly voiceService: VoiceService) {}

  @Modal('changeVolume')
  public async changeVolume(@Ctx() [interaction]: ModalContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId;
      const volumeInput = interaction.fields.getTextInputValue('volume_input');
      if (!volumeInput || !guildId) {
        await interaction.editReply({
          content: '❌ Произошла ошибка при отправке громкости',
        });
        return;
      }

      const numValue = Number(volumeInput);

      if (!this.checkVolumeValue(numValue)) {
        await interaction.editReply({
          content: '❌ Значение находится за диапазоном от 0 до 100',
        });
        return;
      }
      this.logger.debug(`set volume: ${numValue} in modal-handler`);
      await this.voiceService.handleControl(
        guildId,
        'volume',
        [
          //eslint-disable-next-line
          // @ts-ignore
          // eslint-disable-next-line
          interaction as SlashCommandContext,
        ],
        numValue,
      );
      await interaction.editReply({
        content: `Громкость изменена на ${volumeInput}%`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Произошла ошибка при отправке громкости',
      });

      this.logger.error('error in voice change modal');
    }
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, this.TIME_TO_DELETE_MESSAGE);
  }

  private checkVolumeValue(numValue: number) {
    return numValue >= 0 && numValue <= 100;
  }
}
