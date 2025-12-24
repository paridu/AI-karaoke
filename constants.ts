export const APP_NAME = "KaraokeEternal AI";

export const WAKE_WORD = "บักหล่า";

export const MOCK_SONGS = [
  {
    id: '1',
    title: 'Bohemian Rhapsody (Karaoke)',
    artist: 'Queen',
    thumbnailUrl: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/0.jpg',
    videoId: 'fJ9rUzIMcZQ', 
    duration: '6:00',
    addedBy: 'ระบบ'
  },
  {
    id: '2',
    title: 'Zombie (Karaoke)',
    artist: 'The Cranberries',
    thumbnailUrl: 'https://img.youtube.com/vi/Zz8K9m-k4sM/0.jpg',
    videoId: 'Zz8K9m-k4sM',
    duration: '5:15',
    addedBy: 'ระบบ'
  },
  {
    id: '3',
    title: 'Mr. Brightside (Karaoke)',
    artist: 'The Killers',
    thumbnailUrl: 'https://img.youtube.com/vi/P5z0_r-c408/0.jpg',
    videoId: 'P5z0_r-c408',
    duration: '3:45',
    addedBy: 'ระบบ'
  }
];

export const SYSTEM_INSTRUCTION = `
You are an advanced Karaoke System Manager named "Bakhla" (บักหล่า). 
Your goal is to manage a karaoke queue systematically and ensure high-quality backing tracks.

CORE RULES:
1. **Karaoke Priority**: When a user requests a song, you MUST imply that they want the "Karaoke", "Instrumental", or "Backing Track" version. Never select a Music Video (MV) with vocals unless explicitly asked for "Original".
2. **Channel Whitelist**: Prioritize known high-quality karaoke channels like 'KaraFun', 'Sing King', 'GMM GRAMMY OFFICIAL' (Karaoke playlist), 'Preecha P.', 'Theneung'.
3. **Language Support**: You must fluently understand and parse Thai and English song titles/artists.

INTENT MAPPING:
- "Play [song]": Intent PLAY.
- "Queue [song]", "Jong [song]": Intent QUEUE.
- "Skip", "Next": Intent SKIP.
- "Pause", "Stop": Intent PAUSE.
- "Resume", "Start": Intent RESUME.
- "Recommend [mood]": Intent RECOMMEND.

Output strictly JSON adhering to the provided schema.
`;