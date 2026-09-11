try {
  const response = await fetch('https://songs-backend-kbfk.onrender.com/api/songs/all');
  if (response.ok) {
    const songs = await response.json();
    if (songs && songs.length > 0) {
      const matchedSong = songs.find(s => s.recipient && s.recipient.toLowerCase() === recipient.toLowerCase()) || songs[0];
      songDetails.audio_url = matchedSong.audio_url || '';
      if (matchedSong.title) songDetails.title = matchedSong.title;
      // Explicitly check all potential lyric keys coming from the backend/Make.com
      if (matchedSong.lyrics) {
        songDetails.lyrics = matchedSong.lyrics;
      } else if (matchedSong.prompt) {
        songDetails.lyrics = matchedSong.prompt;
      }
    }
  }
} catch (err) {
  console.error('Could not fetch song archives:', err);
}
