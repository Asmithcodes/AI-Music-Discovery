const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// IMPORTANT: Add BOTH of these to your Spotify Dashboard Redirect URIs:
// 1. http://localhost:5173/callback
// 2. https://asmithcodes.github.io/AI-Music-Discovery/callback
const REDIRECT_URI = import.meta.env.PROD
    ? "https://asmithcodes.github.io/AI-Music-Discovery/callback"
    : "http://localhost:5173/callback";
const SCOPES = [
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private",
    "user-read-email"
];

// --- Authentication (PKCE Flow) ---

const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
    // Pure JS SHA-256 implementation
    const sha256Pure = (data) => {
        const ch = (x, y, z) => (x & y) ^ (~x & z);
        const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
        const rotS = (x, n) => (x >>> n) | (x << (32 - n));
        const sigma0 = x => rotS(x, 2) ^ rotS(x, 13) ^ rotS(x, 22);
        const sigma1 = x => rotS(x, 6) ^ rotS(x, 11) ^ rotS(x, 25);
        const gamma0 = x => rotS(x, 7) ^ rotS(x, 18) ^ (x >>> 3);
        const gamma1 = x => rotS(x, 17) ^ rotS(x, 19) ^ (x >>> 10);
        const k = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        let h = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];

        const words = new Uint8Array(data);
        const len = words.length * 8;
        const newW = new Uint8Array(Math.ceil((words.length + 9) / 64) * 64);
        newW.set(words);
        newW[words.length] = 0x80;
        const lenView = new DataView(newW.buffer);
        lenView.setUint32(newW.length - 4, len);

        const w = new Uint32Array(64);

        for (let i = 0; i < newW.length; i += 64) {
            for (let j = 0; j < 16; j++) {
                w[j] = (newW[i + j * 4] << 24) | (newW[i + j * 4 + 1] << 16) | (newW[i + j * 4 + 2] << 8) | newW[i + j * 4 + 3];
            }
            for (let j = 16; j < 64; j++) {
                const s0 = gamma0(w[j - 15]);
                const s1 = gamma1(w[j - 2]);
                w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
            }

            let [a, b, c, d, e, f, g, h0] = h;

            for (let j = 0; j < 64; j++) {
                const t1 = (h0 + sigma1(e) + ch(e, f, g) + k[j] + w[j]) | 0;
                const t2 = (sigma0(a) + maj(a, b, c)) | 0;
                h0 = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }

            h[0] = (h[0] + a) | 0;
            h[1] = (h[1] + b) | 0;
            h[2] = (h[2] + c) | 0;
            h[3] = (h[3] + d) | 0;
            h[4] = (h[4] + e) | 0;
            h[5] = (h[5] + f) | 0;
            h[6] = (h[6] + g) | 0;
            h[7] = (h[7] + h0) | 0;
        }

        const buffer = new ArrayBuffer(32);
        const view = new DataView(buffer);
        h.forEach((val, i) => view.setUint32(i * 4, val));
        return buffer;
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(plain);

    if (window.crypto && window.crypto.subtle) {
        try {
            return await window.crypto.subtle.digest('SHA-256', data);
        } catch (e) {
            console.warn("Web Crypto API failed, falling back to pure JS", e);
            return sha256Pure(data);
        }
    }

    return sha256Pure(data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

export const getLoginUrl = async () => {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    // Store verifier for the callback
    window.sessionStorage.setItem('code_verifier', codeVerifier);

    const params = {
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
    };

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams(params).toString();
    return authUrl.toString();
};

export const getAccessToken = async (code) => {
    const codeVerifier = window.sessionStorage.getItem('code_verifier');

    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        }),
    };

    const body = await fetch("https://accounts.spotify.com/api/token", payload);
    const response = await body.json();

    if (response.access_token) {
        const data = {
            token: response.access_token,
            timestamp: Date.now(),
            expires_in: response.expires_in
        };
        sessionStorage.setItem("spotifyData", JSON.stringify(data));
        return response.access_token;
    } else {
        throw new Error("Failed to retrieve access token");
    }
};

export const getStoredToken = () => {
    const stored = sessionStorage.getItem("spotifyData");
    if (!stored) return null;

    const data = JSON.parse(stored);
    // Basic expiry check (default 1 hour)
    if (Date.now() - data.timestamp > (data.expires_in * 1000)) {
        sessionStorage.removeItem("spotifyData");
        return null;
    }
    return data.token;
};

// --- API Interactions ---

const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
});

const handleResponse = async (response, context) => {
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`${context} failed: ${response.status} ${response.statusText} - ${body}`);
    }
    return response.json();
};

export const searchTrack = async (token, query) => {
    try {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
        const response = await fetch(url, { headers: getHeaders(token) });
        const data = await handleResponse(response, "Search");
        return data.tracks.items || [];
    } catch (error) {
        console.error("Spotify Search Error:", error);
        return [];
    }
};

export const createPlaylist = async (token, userId, name, description) => {
    try {
        const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify({
                name: name,
                description: description,
                public: false // Safer default
            })
        });
        return await handleResponse(response, "Create Playlist");
    } catch (error) {
        console.error("Create Playlist Error:", error);
        throw error; // Re-throw to be caught by UI
    }
};

export const addTracksToPlaylist = async (token, playlistId, uris) => {
    try {
        const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify({ uris })
        });
        return await handleResponse(response, "Add Tracks");
    } catch (error) {
        console.error("Add Tracks Error:", error);
        throw error;
    }
};

export const getUserProfile = async (token) => {
    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: getHeaders(token)
        });
        return await handleResponse(response, "Get User");
    } catch (error) {
        console.error("User Profile Error:", error);
        return null;
    }
};
