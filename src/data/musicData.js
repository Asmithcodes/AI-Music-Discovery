export const musicData = {
    "English": {
        genres: ["Pop", "Rock", "Hip Hop", "Rap", "R&B", "Country", "Jazz", "Electronic/Dance", "Indie", "Classical", "Metal"],
        artists: ["Taylor Swift", "The Weeknd", "Drake", "Ed Sheeran", "Beyoncé", "Justin Bieber", "Ariana Grande", "Coldplay", "Eminem", "Imagine Dragons"],
        moods: ["Happy", "Sad", "Energetic", "Chill", "Romantic", "Focus", "Party", "Workout"],
        activities: ["Driving", "Working/Studying", "Gym/Workout", "Relaxing", "Party", "Commuting", "Gaming"],
        regions: ["US", "UK", "Canada", "Australia", "Global"]
    },
    "Telugu": {
        genres: ["Tollywood Mass", "Melody", "Folk", "Classical (Carnatic)", "Devotional", "Love Failure", "Item Songs", "Remix", "Rap"],
        artists: ["S.P. Balasubrahmanyam", "Sid Sriram", "Devi Sri Prasad (DSP)", "Thaman S", "A.R. Rahman", "Anirudh", "Shreya Ghoshal", "Geetha Madhuri", "Chitra", "Karthik"],
        moods: ["Mass Josh", "Feel Good", "Romantic / Love", "Emotional / Sad", "Devotional", "Peppy"],
        activities: ["Driving / Long Trip", "Dance Practice", "Morning Pooja", "Working", "Relaxing", "Gym"],
        regions: ["Andhra", "Telangana", "Rayalaseema", "Global"]
    },
    "Hindi": {
        genres: ["Bollywood Filmy", "Sufi", "Indie Pop", "Ghazal", "Punjabi Pop", "Classical", "Remix / DJ", "Romantic", "Rap"],
        artists: ["Arijit Singh", "A.R. Rahman", "Shreya Ghoshal", "Atif Aslam", "Sonu Nigam", "Badshah", "Neha Kakkar", "Jubin Nautiyal", "Lata Mangeshkar", "Kishore Kumar"],
        moods: ["Romantic", "Party / Dance", "Heartbroken", "Sufi / Spiritual", "Sukkun (Peace)", "Energetic"],
        activities: ["Long Drive", "Wedding / Sangeet", "Workout", "Coding / Focus", "Chilling with Friends"],
        regions: ["North India", "Mumbai", "Punjab", "Global"]
    },
    "Spanish": {
        genres: ["Reggaeton", "Latin Pop", "Bachata", "Salsa", "Flamenco"],
        artists: ["Bad Bunny", "Shakira", "J Balvin", "Rosalía", "Daddy Yankee"],
        moods: ["Fiesta", "Romántico", "Chill", "Energetic"],
        activities: ["Party", "Dancing", "Driving", "Relaxing"],
        regions: ["Spain", "Mexico", "Puerto Rico", "Colombia", "Global"]
    },
    "Korean": {
        genres: ["K-Pop", "K-R&B", "K-Hip Hop", "Ballad", "OST"],
        artists: ["BTS", "BLACKPINK", "TWICE", "EXO", "NewJeans", "IU"],
        moods: ["Hype", "Soft / Cute", "Emotional", "Chill"],
        activities: ["Study", "Dance", "Commuting", "Cafe Vibes"],
        regions: ["South Korea", "Global"]
    },
    "Japanese": {
        genres: ["J-Pop", "City Pop", "Anime OST", "J-Rock"],
        artists: ["YOASOBI", "Kenshi Yonezu", "Fujii Kaze", "Utada Hikaru", "Official HIGE DANdism"],
        moods: ["Energetic", "Nostalgic", "Kawaii", "Epic"],
        activities: ["Gaming", "Study", "Walking", "Karaoke"],
        regions: ["Japan", "Global"]
    },
    "default": {
        genres: ["Pop", "Rock", "Hip Hop", "Rap", "Classical", "Jazz", "Electronic", "Folk", "Indie"],
        artists: ["No specific artist"], // Fallback
        moods: ["Happy", "Sad", "Energetic", "Relaxed", "Focus"],
        activities: ["Working", "Driving", "Workout", "Relaxing"],
        regions: ["Global"]
    }
};

export const languages = [
    { value: "English", label: "English" },
    { value: "Telugu", label: "Telugu" },
    { value: "Hindi", label: "Hindi" },
    { value: "Spanish", label: "Spanish" },
    { value: "Korean", label: "Korean" },
    { value: "Japanese", label: "Japanese" }
];
