# 🎵 AI Music Discoverer

An intelligent music recommendation engine powered by **Google Gemini AI** and **Spotify**.
Discover songs based on your mood, activity, and region, and verify their existence instantly before playing.

## ✨ Features
- **AI Recommendations**: Personalized suggestions using Gemini AI.
- **Silent Verification**: Automatically filters out AI hallucinations or non-existent songs.
- **Spotify Integration**: Play tracks directly and export playlists to your account.
- **Smart Search**: Verified Artist + Title matching prevents playing the wrong song.
- **Quota Recovery**: Automatically handles API rate limits.

## 🚀 Deployment Guide (GitHub Pages)

This project is configured to deploy automatically to GitHub Pages using **GitHub Actions**.

### 1. Prerequisites
You need a GitHub repository. (You have this: `https://github.com/Asmithcodes/AI-Music-Discovery`)

### 2. Configure GitHub Secrets
For the app to work online, you must add your API keys to GitHub so the build process can use them.

1. Go to your Repository on GitHub.
2. Click **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Add the following two secrets:

| Name | Value |
|------|-------|
| `VITE_GEMINI_API_KEY` | Your Gemini API Key |
| `VITE_SPOTIFY_CLIENT_ID` | Your Spotify Client ID |

### 3. Deploy
Simply push your code to the `main` branch.
```bash
git add .
git commit -m "Deploy to GitHub"
git push origin main
```
The "Deploy to GitHub Pages" action will run automatically. You can monitor it in the **Actions** tab.

## 🛠️ Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/Asmithcodes/AI-Music-Discovery.git
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Setup Environment**
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_key_here
   VITE_SPOTIFY_CLIENT_ID=your_id_here
   ```
4. **Run**
   ```bash
   npm run dev
   ```

## 📄 License
This project is open source.
