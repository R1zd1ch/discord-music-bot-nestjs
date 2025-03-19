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

  private ensureCacheDirExists() {
    if (!fs.existsSync(this.CACHE_DIR)) {
      fs.mkdirSync(this.CACHE_DIR);
    }
  }

  cleanupTrack(trackId) {
    const filePath = path.join(this.CACHE_DIR, `${trackId}.mp3`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private setupCleanupSchedule() {
    setInterval(() => this.cleanupOldFiles(), this.SCHEDULE_TIME);
  }

  private cleanupOldFiles() {
    const now = Date.now();

    fs.readdir(this.CACHE_DIR, (err, files) => {
      files.forEach((file) => {
        const filePath = path.join(this.CACHE_DIR, file);
        fs.stat(filePath, (err, stats) => {
          if (now - stats.mtimeMs > this.MAX_AGE) {
            fs.unlink(filePath, (err: Error) => {
              if (err) this.logger.error(`Cache cleanup error: ${err.message}`);
              else this.logger.log(`Cleaned up: ${filePath}`);
            });
          }
        });
      });
    });
  }
}
