import { StringOption } from 'necord';

export class PlayDto {
  @StringOption({
    name: 'query',
    description: 'Ссылка на плейлист, альбом, трек или название трека',
    required: true,
  })
  url: string;
}
