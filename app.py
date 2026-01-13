from flask import Flask, request, render_template, jsonify
import requests

app = Flask(__name__)
API_BASE = "https://www.sankavollerei.com"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.sankavollerei.com/'
}

@app.route('/')
def home():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/home", headers=HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') != 'success':
            return render_template('home.html', error=f"API Error: {data.get('message', 'Unknown error')}")
        
        recent = data.get('data', {}).get('recent', {}).get('animeList', [])
        movies = data.get('data', {}).get('movie', {}).get('animeList', [])
        top10 = data.get('data', {}).get('top10', {}).get('animeList', [])
        
        return render_template('home.html', recent=recent[:16], movies=movies[:8], top10=top10)
        
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/recent')
def recent():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/recent", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('home.html', recent=anime_list, page_title="Anime Terbaru")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/movies')
def movies():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/movies", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('home.html', movies=anime_list, page_title="Anime Movies")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/ongoing')
def ongoing():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/ongoing", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('home.html', ongoing=anime_list, page_title="Anime Ongoing")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/completed')
def completed():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/completed", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('home.html', recent=anime_list, page_title="Anime Sudah Tamat")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/popular')
def popular():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/popular", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('home.html', recent=anime_list, page_title="Anime Terpopuler")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/schedule')
def schedule():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/schedule", headers=HEADERS, timeout=10)
        data = response.json()
        schedule_data = data.get('data', {})
        return render_template('schedule.html', schedule_data=schedule_data)
    except Exception as e:
        return render_template('schedule.html', error=str(e))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    
    if not query:
        return render_template('search.html')
    
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/search?q={query}", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('search.html', anime_list=anime_list, query=query)
    except Exception as e:
        return render_template('search.html', error=str(e), query=query)

@app.route('/list')
def anime_list():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/list", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('list', [])
        return render_template('anime_list.html', anime_list=anime_list)
    except Exception as e:
        return render_template('anime_list.html', error=str(e))

@app.route('/genres')
def genres():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/genres", headers=HEADERS, timeout=10)
        data = response.json()
        genre_list = data.get('data', {}).get('genreList', [])
        return render_template('genres.html', genre_list=genre_list)
    except Exception as e:
        return render_template('genres.html', error=str(e))

@app.route('/genres/<genre_id>')
def genre_detail(genre_id):
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/genres/{genre_id}", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        genre_title = genre_id.replace('-', ' ').title()
        return render_template('home.html', recent=anime_list, page_title=f"Genre: {genre_title}")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/batch')
def batch():
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/batch", headers=HEADERS, timeout=10)
        data = response.json()
        batch_list = data.get('data', {}).get('batchList', [])
        return render_template('home.html', batch_list=batch_list, page_title="Batch Download")
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/batch/<batch_id>')
def batch_detail(batch_id):
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/batch/{batch_id}", headers=HEADERS, timeout=10)
        data = response.json()
        batch = data.get('data', {})
        return render_template('anime_detail.html', anime=batch, is_batch=True)
    except Exception as e:
        return render_template('anime_detail.html', error=str(e))

# ✨ NEW: Bookmark Page
@app.route('/bookmark')
def bookmark():
    return render_template('bookmark.html')

@app.route('/anime/<anime_id>')
def anime_detail(anime_id):
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/anime/{anime_id}", headers=HEADERS, timeout=10)
        data = response.json()
        anime = data.get('data', {})
        
        if anime.get('score'):
            print(f"Score data: {anime['score']}")
            print(f"Score type: {type(anime['score'])}")
        
        return render_template('anime_detail.html', anime=anime)
    except Exception as e:
        return render_template('anime_detail.html', error=str(e))

@app.route('/episode/<episode_id>')
def episode_detail(episode_id):
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/episode/{episode_id}", headers=HEADERS, timeout=10)
        data = response.json()
        episode = data.get('data', {})
        
        if episode and episode.get('animeId'):
            try:
                anime_response = requests.get(
                    f"{API_BASE}/anime/samehadaku/anime/{episode['animeId']}", 
                    headers=HEADERS, 
                    timeout=10
                )
                anime_data = anime_response.json()
                
                if anime_data.get('status') == 'success':
                    anime_info = anime_data.get('data', {})
                    if anime_info.get('episodeList'):
                        episode['fullEpisodeList'] = anime_info['episodeList']
                        print(f"✅ Successfully loaded {len(anime_info['episodeList'])} episodes")
                    else:
                        print("⚠️ No episodeList in anime data")
                else:
                    print(f"⚠️ Failed to fetch anime data: {anime_data.get('message')}")
                    
            except Exception as anime_error:
                print(f"⚠️ Error fetching anime data: {str(anime_error)}")
        
        return render_template('episode_detail.html', episode=episode)
        
    except Exception as e:
        return render_template('episode_detail.html', error=str(e))

@app.route('/api/server/<server_id>')
def get_server_url(server_id):
    try:
        response = requests.get(f"{API_BASE}/anime/samehadaku/server/{server_id}", headers=HEADERS, timeout=10)
        data = response.json()
        
        if data.get('status') == 'success':
            return jsonify({'url': data.get('data', {}).get('url', '')})
        else:
            return jsonify({'error': 'Server not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
