import { Injectable, Logger } from '@nestjs/common';
import { On, Once } from 'necord';

@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  @Once('ready')
  onReady() {
    this.logger.log('🤖 Бот успешно запущен!');
  }

  @On('error')
  onError(error: Error) {
    this.logger.error(
      `Произошла ошибка в Discord клиенте: ${error.message}`,
      error.stack,
    );

    if (
      error.message.includes('token') ||
      error.message.includes('authentication')
    ) {
      this.logger.fatal(
        'Критическая ошибка аутентификации, требуется перезапуск',
      );
    }
  }

  @On('warn')
  onWarn(message: string) {
    this.logger.warn(`Предупреждение от Discord клиента: ${message}`);
  }

  // @On('debug')
  // onDebug(message: string) {
  //   // Раскомментируйте для отладки
  //   // this.logger.debug(`Debug: ${message}`);
  // }
}
