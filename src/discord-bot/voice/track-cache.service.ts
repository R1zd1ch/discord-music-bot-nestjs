import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { YandexMusicService } from 'src/yandex-music/yandex-music.service';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class TrackCacheService {
  private logger = new Logger(TrackCacheService.name);
  private readonly CACHE_DIR = path.join(__dirname, '..', '..', 'temp');
  private readonly MAX_AGE = 2 * 60 * 60 * 1000;
  private readonly SCHEDULE_TIME = 60 * 60 * 1000;

  constructor(private readonly yandexMusicService: YandexMusicService) {
    this.ensureCacheDirExists();
    this.setupCleanupSchedule();
  }

  async getTrackPath(trackId: string): Promise<string> {
    const filePath = path.join(this.CACHE_DIR, `${trackId}.mp3`);
    if (fs.existsSync(filePath)) {
      this.logger.log(`Using cached track: ${filePath}`);
      return filePath;
    }

    return this.downloadAndCacheTrack(trackId, filePath);
  }

  private async downloadAndCacheTrack(trackId: string, filePath: string) {
    const dataSource = await this.yandexMusicService.getTrackSourceYM(trackId);
    if (!dataSource?.source) {
      throw new Error('Track source not found');
    }
    const response = await axios.get(dataSource.source, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    await fs.promises.writeFile(filePath, buffer);

    return filePath;
  }

  private async ensureCacheDirExists() {
    try {
      await fs.promises.access(this.CACHE_DIR);
    } catch {
      await fs.promises.mkdir(this.CACHE_DIR, { recursive: true });
    }
  }

  cleanupTrack(trackId) {
    const filePath = path.join(this.CACHE_DIR, `${trackId}.mp3`);
    fs.promises.unlink(filePath).catch((err) => {
      if (err.code !== 'ENOENT') {
        this.logger.error(`Error removing track file: ${err.message}`);
      }
    });
  }

  private setupCleanupSchedule() {
    setInterval(() => this.cleanupOldFiles(), this.SCHEDULE_TIME);
  }

  private async cleanupOldFiles() {
    const now = Date.now();

    try {
      const files = await fs.promises.readdir(this.CACHE_DIR);

      for (const file of files) {
        const filePath = path.join(this.CACHE_DIR, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > this.MAX_AGE) {
            await fs.promises.unlink(filePath);
            this.logger.log(`Cleaned up: ${filePath}`);
          }
        } catch (err) {
          this.logger.error(
            `Cache cleanup error for ${filePath}: ${err.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Cache directory read error: ${err.message}`);
    }
  }
}
