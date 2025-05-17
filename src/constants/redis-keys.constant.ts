export const RedisKeys = {
  queue: (guildId: string) => `queue:${guildId}`,
  volume: (guildId: string) => `volume:${guildId}`,
  playerMessageId: (guildId: string) => `playerMessageId:${guildId}`,
  playlists: (userId: string) => `user:playlists:${userId}`,
  playlistTracks: (playlistId: string) => `playlist:tracks:${playlistId}`,
  track: (guildId: string) => `queue:track:${guildId}`,
  queuePagination: (guildId: string) => `queue:pagination:${guildId}`,
  searchResult: (guildId: string) => `queue:searchResult:${guildId}`,
};
