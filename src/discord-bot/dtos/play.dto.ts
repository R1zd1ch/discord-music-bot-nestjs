import { StringOption } from 'necord';

export class PlayDto {
  @StringOption({
    name: 'url',
    description: 'Ссылка на трек',
    required: true,
  })
  url: string;
}
