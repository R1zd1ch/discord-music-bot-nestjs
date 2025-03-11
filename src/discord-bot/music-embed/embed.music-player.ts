import { EmbedBuilder } from 'discord.js';
import { ResponseTrackType } from 'src/yandex-music/types/response-track.type';
import { Track } from 'yandex-music-client';

export function createTrackEmbed(
  track: ResponseTrackType,
  queueTrack: Track,

  totalTracks: number,
  nextTrack: string | undefined,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(track.title)
    .setDescription(
      `Длительность: ${Math.floor(track.duration / 1000 / 60)}:${(Math.floor(track.duration / 1000) % 60).toString().padStart(2, '0')}\n Осталось треков: ${totalTracks} \n Следующий трек: ${nextTrack}`,
    )
    .addFields({
      name: 'Автор',
      value: queueTrack.albums
        .map((a) => a.artists.map((a) => a.name))
        .join(', '),
      inline: true,
    })
    .setThumbnail(
      track.coverUri.startsWith('http')
        ? track.coverUri
        : `https://${track.coverUri}`,
    )
    .setColor('Purple');
}
