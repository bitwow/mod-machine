const modArchiveTrack = (id, label, author = 'Jogeir Liljedahl') => ({
  id: String(id),
  label,
  author,
  source: `https://api.modarchive.org/downloads.php?moduleid=${id}`,
  sourcePage: `https://modarchive.org/index.php?query=${id}&request=view_by_moduleid`,
});

export const seedTracks = [
  modArchiveTrack(65280, 'Variations'),
  modArchiveTrack(51604, '00noname'),
  modArchiveTrack(61595, 'Overture'),
  modArchiveTrack(47493, 'Last Farewell'),
  modArchiveTrack(167093, 'GComp'),
  modArchiveTrack(47651, 'Keys to Imagination'),
  modArchiveTrack(57542, 'Smile'),
  modArchiveTrack(165651, 'Infinity'),
  modArchiveTrack(41006, 'Face Another Day'),
];
