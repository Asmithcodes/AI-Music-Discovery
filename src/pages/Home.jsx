import React, { useState } from 'react';
import { generateRecommendations } from '../services/aiService';
import { musicData, languages } from '../data/musicData';
import { getLoginUrl, getStoredToken, getAccessToken, searchTrack, createPlaylist, addTracksToPlaylist, getUserProfile } from '../services/spotifyService';

const Home = () => {
    const [formData, setFormData] = useState({
        genre: '',
        artist: '',
        mood: '',
        era: '',
        tempo: '',
        language: '',
        activity: ''
    });
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [customKey, setCustomKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

    // Spotify State
    const [spotifyToken, setSpotifyToken] = useState(null);
    const [spotifyUser, setSpotifyUser] = useState(null);
    const [playingTrackId, setPlayingTrackId] = useState(null);
    const [playingIndex, setPlayingIndex] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(null);

    React.useEffect(() => {
        // 1. Check for stored token first
        const storedToken = getStoredToken();
        if (storedToken) {
            setSpotifyToken(storedToken);
            getUserProfile(storedToken).then(user => setSpotifyUser(user));
        }

        // 2. Check for Authorization Code (PKCE Callback)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            // Clean URL immediately
            window.history.replaceState({}, document.title, window.location.pathname);

            // Exchange code for token
            getAccessToken(code).then(token => {
                setSpotifyToken(token);
                return getUserProfile(token);
            }).then(user => {
                setSpotifyUser(user);
            }).catch(err => {
                console.error("Spotify Auth Failed:", err);
                setError("Spotify Connection failed. Please try again.");
            });
        }
    }, []);

    const handleSpotifyLogin = async () => {
        try {
            const url = await getLoginUrl();
            window.location.href = url;
        } catch (err) {
            console.error("Login setup failed", err);
        }
    };

    const findBestMatch = (tracks, targetTitle, targetArtist) => {
        if (!tracks || tracks.length === 0) return null;

        const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetTitleNorm = normalize(targetTitle);
        const targetArtistNorm = targetArtist && targetArtist !== 'Unknown' ? normalize(targetArtist) : null;

        return tracks.find(track => {
            // 1. Verify Artist (if known)
            let artistMatch = true;
            if (targetArtistNorm) {
                artistMatch = track.artists.some(artist => {
                    const source = normalize(artist.name);
                    return source.includes(targetArtistNorm) || targetArtistNorm.includes(source);
                });
            }

            // 2. Verify Title (CRITICAL)
            // Strip (feat. ...) and [remix] parts to avoid matching artist names inside titles
            const cleanTrackName = track.name.replace(/\s*[([].*?[)\]]/g, '');
            const trackTitleNorm = normalize(cleanTrackName);

            // Check for fuzzy match on the CLEANED title
            const titleMatch = trackTitleNorm.includes(targetTitleNorm) || targetTitleNorm.includes(trackTitleNorm);

            return artistMatch && titleMatch;
        });
    };

    const verifySong = async (song) => {
        if (!spotifyToken) return null; // Cannot verify without token

        let track = null;
        try {
            // Strategy 1: Precise Search
            let query = `track:"${song.title}" artist:"${song.artist}"`;
            if (song.artist === 'Unknown' || !song.artist) query = song.title;

            let tracks = await searchTrack(spotifyToken, query);
            track = findBestMatch(tracks, song.title, song.artist);

            // Strategy 2: Loose Search
            if (!track) {
                const looseQuery = `${song.title} ${song.artist}`;
                tracks = await searchTrack(spotifyToken, looseQuery);
                track = findBestMatch(tracks, song.title, song.artist);
            }

            // Strategy 3: Search by Title only
            if (!track) {
                const titleQuery = `track:"${song.title}"`;
                tracks = await searchTrack(spotifyToken, titleQuery);
                track = findBestMatch(tracks, song.title, song.artist);
            }
        } catch (err) {
            console.warn("Verification failed for:", song.title, err);
        }
        return track;
    };

    const handlePlay = async (song, index) => {
        if (!spotifyToken) {
            alert("Please connect to Spotify first!");
            return;
        }

        try {
            const track = await verifySong(song);

            if (track && track.id) {
                setPlayingTrackId(track.id);
                setPlayingIndex(index);
            } else {
                console.warn(`Could not find a match for ${song.title} by ${song.artist}`);
                alert(`Song "${song.title}" by ${song.artist} not found on Spotify!`);
            }
        } catch (error) {
            console.error("Play Error:", error);
            alert("Could not load song.");
        }
    };

    const handleExportToSpotify = async () => {
        if (!spotifyToken || !recommendations) return;
        setExporting(true);
        setExportSuccess(null);

        try {
            const user = spotifyUser || await getUserProfile(spotifyToken);
            if (!user) throw new Error("Could not fetch Spotify profile");

            const trackUris = [];
            for (const song of recommendations) {
                const track = await verifySong(song);
                if (track) {
                    trackUris.push(track.uri);
                }
            }

            if (trackUris.length === 0) {
                throw new Error("No comparable songs found on Spotify!");
            }

            const playlistName = `AI Mix: ${formData.genre} (${formData.language || 'Global'})`;
            const description = `Generated by AI Music Discoverer for mood: ${formData.mood}, activity: ${formData.activity}.`;
            const playlist = await createPlaylist(spotifyToken, user.id, playlistName, description);

            await addTracksToPlaylist(spotifyToken, playlist.id, trackUris);

            setExportSuccess(`Playlist "${playlistName}" created with ${trackUris.length} songs!`);
            window.open(playlist.external_urls.spotify, '_blank');
        } catch (err) {
            console.error(err);
            setError("Spotify Export Failed: " + err.message);
        } finally {
            setExporting(false);
        }
    };



    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const processRecommendations = async (data) => {
        if (!spotifyToken) return data; // Return raw data if not connected

        // Verify each song
        const verifiedResults = [];
        for (const song of data) {
            const track = await verifySong(song);
            if (track) {
                verifiedResults.push(song); // Keep original AI song object if verified
            } else {
                console.log(`Filtered out hallucination: ${song.title} by ${song.artist}`);
            }
        }
        return verifiedResults;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setRecommendations(null);
        setPlayingTrackId(null);
        setPlayingIndex(null);

        try {
            const rawData = await generateRecommendations(formData, customKey);
            const verifiedData = await processRecommendations(rawData);

            if (verifiedData.length === 0 && rawData.length > 0) {
                setError("AI generated songs but none could be found on Spotify. Please try a cleaner search.");
            } else {
                setRecommendations(verifiedData);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to generate recommendations. Please check your API key or try again.");
            const errorMsg = err.message ? err.message.toLowerCase() : "";
            if (errorMsg.includes("api key") || errorMsg.includes("403") || errorMsg.includes("401") || errorMsg.includes("400") || errorMsg.includes("429") || errorMsg.includes("quota")) {
                setShowKeyInput(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        setLoadingMore(true);
        setError(null);

        try {
            const rawData = await generateRecommendations(formData, customKey);
            const verifiedData = await processRecommendations(rawData);

            if (verifiedData.length > 0) {
                setRecommendations(prev => [...prev, ...verifiedData]);
            } else {
                alert("AI generated more songs, but none were verifiable on Spotify.");
            }
        } catch (err) {
            console.error(err);
            const errorMsg = err.message ? err.message.toLowerCase() : "";
            if (errorMsg.includes("api key") || errorMsg.includes("429") || errorMsg.includes("quota")) {
                setShowKeyInput(true);
                alert("API Limit Exceeded. Please enter a new API Key.");
            } else {
                alert("Failed to load more songs.");
            }
        } finally {
            setLoadingMore(false);
        }
    };


    const getOptions = (category) => {
        if (!formData.language) return [];
        const data = musicData[formData.language] || musicData["default"];
        return data[category] || [];
    };

    const handleKeySubmit = (e) => {
        e.preventDefault();
        handleSubmit(e);
    };

    return (
        <div style={{
            width: '100%',
            maxWidth: '900px',
            zIndex: 2,
        }}>
            <div className="fade-in glass-panel" style={{
                borderRadius: '24px',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative Glow */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0) 70%)',
                    zIndex: -1,
                    pointerEvents: 'none'
                }} />

                <div className="app-header">
                    <h1 style={{
                        textAlign: 'center',
                        fontSize: '3rem',
                        fontWeight: '800',
                        letterSpacing: '-1px',
                        lineHeight: '1.2',
                        margin: 0
                    }}>
                        <span className="text-gradient">AI Music Discoverer</span>
                    </h1>

                    <div className="spotify-status">
                        {!spotifyToken ? (
                            <button
                                onClick={handleSpotifyLogin}
                                style={{
                                    background: '#1DB954',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '50px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 10px rgba(29, 185, 84, 0.3)'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>🎧</span> Connect Spotify
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(29, 185, 84, 0.2)', padding: '0.4rem 1rem', borderRadius: '50px', border: '1px solid #1DB954' }}>
                                <span style={{ fontSize: '1rem' }}>✅</span>
                                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600' }}>Connected</span>
                            </div>
                        )}
                    </div>
                </div>

                {!recommendations ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>


                        {/* Top Row: Language (Driver) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Select Language First 🌐</label>
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleInputChange}
                                    style={{ ...inputStyle, borderColor: 'var(--primary-color)', background: 'rgba(139, 92, 246, 0.1)' }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    required
                                >
                                    <option value="" disabled>-- Choose Language --</option>
                                    {languages.map(lang => (
                                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Genre & Region (Context) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div className="input-group">
                                <label style={labelStyle}>Favorite Genre <span style={{ color: 'var(--secondary-color)' }}>*</span></label>
                                <select
                                    name="genre"
                                    value={formData.genre}
                                    onChange={handleInputChange}
                                    required
                                    style={inputStyle}
                                    disabled={!formData.language}
                                >
                                    <option value="">{formData.language ? "Select Genre" : "Select Language First"}</option>
                                    {getOptions('genres').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other / Custom</option>
                                </select>
                                {formData.genre === 'Other' && (
                                    <input
                                        type="text"
                                        name="custom_genre"
                                        placeholder="Type your favorite genre..."
                                        value={formData.custom_genre}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, marginTop: '0.5rem', borderColor: 'var(--secondary-color)' }}
                                        required
                                    />
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Region (Optional)</label>
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    disabled={!formData.language}
                                >
                                    <option value="">{formData.language ? "Select Region" : "Select Language First"}</option>
                                    {getOptions('regions').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other / Custom</option>
                                </select>
                                {formData.region === 'Other' && (
                                    <input
                                        type="text"
                                        name="custom_region"
                                        placeholder="Specific region..."
                                        value={formData.custom_region}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, marginTop: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Row 3: Artist & Mood */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div className="input-group">
                                <label style={labelStyle}>Favorite Artist <span style={{ color: 'var(--text-muted)', fontSize: '0.8em', textTransform: 'none' }}>(Optional)</span></label>
                                <select
                                    name="artist"
                                    value={formData.artist}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    disabled={!formData.language}
                                >
                                    <option value="">{formData.language ? "Select Artist (Optional)" : "Select Language First"}</option>
                                    {getOptions('artists').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other / Custom</option>
                                </select>
                                {formData.artist === 'Other' && (
                                    <input
                                        type="text"
                                        name="custom_artist"
                                        placeholder="Type artist name..."
                                        value={formData.custom_artist}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, marginTop: '0.5rem', borderColor: 'var(--secondary-color)' }}
                                    />
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Mood</label>
                                <select
                                    name="mood"
                                    value={formData.mood}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    disabled={!formData.language}
                                >
                                    <option value="">{formData.language ? "Select Mood" : "Select Language First"}</option>
                                    {getOptions('moods').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other / Custom</option>
                                </select>
                                {formData.mood === 'Other' && (
                                    <input
                                        type="text"
                                        name="custom_mood"
                                        placeholder="Describe your mood..."
                                        value={formData.custom_mood}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, marginTop: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Row 4: Era, Tempo, Activity */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Era</label>
                                <select
                                    name="era"
                                    value={formData.era}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                >
                                    <option value="">Any Era</option>
                                    <option value="60s">1960s</option>
                                    <option value="70s">1970s</option>
                                    <option value="80s">1980s</option>
                                    <option value="90s">1990s</option>
                                    <option value="2000s">2000s</option>
                                    <option value="2010s">2010s</option>
                                    <option value="Modern">Modern / 2020s</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Tempo</label>
                                <select
                                    name="tempo"
                                    value={formData.tempo}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                >
                                    <option value="">Any Tempo</option>
                                    <option value="Chill/Slow">Chill / Slow</option>
                                    <option value="Mid-tempo">Mid-tempo</option>
                                    <option value="Upbeat/Fast">Upbeat / High Energy</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Activity</label>
                                <select
                                    name="activity"
                                    value={formData.activity}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    disabled={!formData.language}
                                >
                                    <option value="">{formData.language ? "Select Activity" : "Select Language First"}</option>
                                    {getOptions('activities').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other / Custom</option>
                                </select>
                                {formData.activity === 'Other' && (
                                    <input
                                        type="text"
                                        name="custom_activity"
                                        placeholder="What are you doing?"
                                        value={formData.custom_activity}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, marginTop: '0.5rem', fontSize: '0.9rem' }}
                                    />
                                )}
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#fca5a5' }}>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>⚠️</span> {error}
                                </p>
                                {showKeyInput && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Enter your own Gemini API Key:</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="password"
                                                value={customKey}
                                                onChange={(e) => setCustomKey(e.target.value)}
                                                placeholder="AIza..."
                                                style={{ ...inputStyle, flex: 1 }}
                                            />
                                            <button onClick={handleKeySubmit} style={{ ...buttonStyle, width: 'auto', padding: '0 1.5rem' }}>Retry</button>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', marginTop: '0.8rem', color: 'var(--text-muted)' }}>
                                            Need help? Contact <a href="mailto:asmyth@duck.com" style={{ color: 'var(--secondary-color)', textDecoration: 'underline' }}>asmyth@duck.com</a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...buttonStyle,
                                opacity: loading ? 0.8 : 1,
                                cursor: loading ? 'wait' : 'pointer',
                                marginTop: '1rem'
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <span className="loading-dots">✨</span> {formData.language ? `Discover ${formData.language} Music ✨` : 'Discover Music ✨'}
                                </div>
                            ) : (
                                formData.language ? `Generate ${formData.language} Recommendations ✨` : 'Generate Recommendations ✨'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="fade-in">
                        <div className="result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Your Mix</h2>
                                {exportSuccess && <p style={{ color: '#1DB954', fontSize: '0.9rem', marginTop: '0.5rem' }}>{exportSuccess}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {spotifyToken && (
                                    <button
                                        onClick={handleExportToSpotify}
                                        disabled={exporting}
                                        style={{
                                            background: exporting ? 'gray' : '#1DB954',
                                            border: 'none',
                                            color: 'white',
                                            padding: '0.5rem 1.5rem',
                                            borderRadius: '50px',
                                            cursor: exporting ? 'wait' : 'pointer',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {exporting ? 'Saving...' : 'Save to Spotify 🎵'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setRecommendations(null)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-color)',
                                        padding: '0.5rem 1.5rem',
                                        borderRadius: '50px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                >
                                    ← New Search
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {recommendations.map((song, index) => (
                                <div key={index} className="glass-panel" style={{
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    transition: 'all 0.3s ease',
                                    transition: 'all 0.3s ease',
                                    cursor: 'default',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '0.2rem' }}>{song.title}</h3>
                                                <span style={{ fontSize: '1.1rem', color: 'var(--secondary-color)', fontWeight: '600' }}>{song.artist}</span>
                                            </div>
                                            {song.album && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>💿 {song.album}</p>}
                                            <p style={{ fontSize: '1rem', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>{song.reason}</p>
                                        </div>

                                        {/* Play Button */}
                                        {spotifyToken && (
                                            <button
                                                onClick={() => handlePlay(song, index)}
                                                style={{
                                                    background: 'rgba(29, 185, 84, 0.1)',
                                                    border: '1px solid #1DB954',
                                                    borderRadius: '50%',
                                                    width: '40px',
                                                    height: '40px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    marginLeft: '1rem',
                                                    flexShrink: 0
                                                }}
                                                title="Play on Spotify"
                                            >
                                                ▶️
                                            </button>
                                        )}
                                    </div>

                                    {/* Embedded Player - Shows only if this song is playing */}
                                    {playingIndex === index && playingTrackId && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <iframe
                                                src={`https://open.spotify.com/embed/track/${playingTrackId}`}
                                                width="100%"
                                                height="80"
                                                frameBorder="0"
                                                allowtransparency="true"
                                                allow="encrypted-media"
                                                title={`Spotify Player ${song.title}`}
                                            ></iframe>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                style={{
                                    ...buttonStyle,
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid var(--glass-border)',
                                    opacity: loadingMore ? 0.7 : 1,
                                    cursor: loadingMore ? 'wait' : 'pointer'
                                }}
                            >
                                {loadingMore ? 'Finding more gems... 💎' : '✨ Generate 5 More Matches'}
                            </button>

                            <button
                                onClick={() => setRecommendations(null)}
                                style={{
                                    ...buttonStyle,
                                    flex: 1,
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-color)'
                                }}
                            >
                                ↩️ Modify Search
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

// Refined Styles
const labelStyle = {
    display: 'block',
    marginBottom: '0.6rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const inputStyle = {
    width: '100%',
    padding: '1rem 1.2rem',
    background: 'var(--input-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    color: 'var(--text-color)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
};

const buttonStyle = {
    width: '100%',
    padding: '1.2rem',
    background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
};

export default Home;
