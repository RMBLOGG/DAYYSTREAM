from flask import Flask, request, render_template, jsonify
import requests
import time
import threading

app = Flask(__name__)
API_BASE = "https://www.sankavollerei.com"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.sankavollerei.com/',
    'Origin': 'https://www.sankavollerei.com',
    'Connection': 'keep-alive',
}

# ============================================================
# CACHE SYSTEM
# Durasi cache berbeda tiap jenis konten:
#   - List/home/ongoing : 10 menit (konten sering update)
#   - Detail anime      : 30 menit (jarang berubah)
#   - Episode detail    : 60 menit (hampir tidak berubah)
#   - Schedule/genres   : 60 menit
# ============================================================
cache_store = {}
CACHE_DURATION = {
    'short':  600,   # 10 menit  - list, home, recent
    'medium': 1800,  # 30 menit  - detail anime
    'long':   3600,  # 60 menit  - episode, schedule, genres
}

# Rate limiter: maks 60 req/menit (aman di bawah limit 70)
_request_lock = threading.Lock()
_request_times = []
MAX_REQUESTS_PER_MINUTE = 60

def _wait_for_rate_limit():
    """Pastikan tidak melebihi 60 request per menit"""
    with _request_lock:
        now = time.time()
        # Buang timestamp yang sudah lebih dari 60 detik
        while _request_times and now - _request_times[0] > 60:
            _request_times.pop(0)
        
        if len(_request_times) >= MAX_REQUESTS_PER_MINUTE:
            # Hitung berapa lama harus tunggu
            wait = 60 - (now - _request_times[0]) + 0.5
            print(f"⏳ Rate limit: tunggu {wait:.1f}s")
            time.sleep(max(wait, 0))
        
        _request_times.append(time.time())

def get_cached_or_fetch(url, cache_key, timeout=15, cache_type='short'):
    """Ambil dari cache atau fetch dari API dengan rate limit protection"""
    now = time.time()
    duration = CACHE_DURATION.get(cache_type, CACHE_DURATION['short'])
    
    # Cek cache dulu
    if cache_key in cache_store:
        cached_data, timestamp = cache_store[cache_key]
        if now - timestamp < duration:
            print(f"✅ Cache HIT: {cache_key}")
            return cached_data
    
    print(f"🌐 API Request: {cache_key}")
    
    # Rate limit check
    _wait_for_rate_limit()
    
    # Retry 3x jika kena 403/429
    last_error = None
    for attempt in range(3):
        try:
            response = requests.get(url, headers=HEADERS, timeout=timeout)
            
            if response.status_code in (403, 429):
                wait = (attempt + 1) * 5  # 5s, 10s, 15s
                print(f"⚠️ Rate limited ({response.status_code}), retry {attempt+1}/3 dalam {wait}s")
                time.sleep(wait)
                continue
            
            response.raise_for_status()
            data = response.json()
            cache_store[cache_key] = (data, now)
            return data
            
        except Exception as e:
            last_error = e
            if attempt < 2:
                time.sleep(2)
    
    # Semua retry gagal - coba pakai stale cache
    if cache_key in cache_store:
        print(f"⚠️ Pakai stale cache: {cache_key}")
        return cache_store[cache_key][0]
    
    raise last_error

@app.route('/')
def home():
    try:
        # Get home data with cache
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/home",
            'home_page',
            timeout=15,
            cache_type='short'
        )
        
        if data.get('status') != 'success':
            return render_template('home.html', error=f"API Error: {data.get('message', 'Unknown error')}")
        
        recent = data.get('data', {}).get('recent', {}).get('animeList', [])
        movies = data.get('data', {}).get('movie', {}).get('animeList', [])
        top10 = data.get('data', {}).get('top10', {}).get('animeList', [])
        
        return render_template('home.html', recent=recent, movies=movies[:8], top10=top10)
        
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/recent')
def recent():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/recent?page={page}",
            f'recent_page_{page}',
            timeout=10,
            cache_type='short'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             recent=anime_list, 
                             page_title="Anime Terbaru",
                             pagination=pagination,
                             current_route='recent')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/movies')
def movies():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/movies?page={page}",
            f'movies_page_{page}',
            timeout=10,
            cache_type='short'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             movies=anime_list, 
                             page_title="Anime Movies",
                             pagination=pagination,
                             current_route='movies')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/ongoing')
def ongoing():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/ongoing?page={page}",
            f'ongoing_page_{page}',
            timeout=10,
            cache_type='short'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             ongoing=anime_list, 
                             page_title="Anime Ongoing",
                             pagination=pagination,
                             current_route='ongoing')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/completed')
def completed():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/completed?page={page}",
            f'completed_page_{page}',
            timeout=10,
            cache_type='short'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             recent=anime_list, 
                             page_title="Anime Sudah Tamat",
                             pagination=pagination,
                             current_route='completed')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/popular')
def popular():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/popular?page={page}",
            f'popular_page_{page}',
            timeout=10,
            cache_type='short'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             recent=anime_list, 
                             page_title="Anime Terpopuler",
                             pagination=pagination,
                             current_route='popular')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/schedule')
def schedule():
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/schedule",
            'schedule_page',
            timeout=10,
            cache_type='long'
        )
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
        # Don't cache search results (they're user-specific)
        response = requests.get(f"{API_BASE}/anime/samehadaku/search?q={query}", headers=HEADERS, timeout=10)
        data = response.json()
        anime_list = data.get('data', {}).get('animeList', [])
        return render_template('search.html', anime_list=anime_list, query=query)
    except Exception as e:
        return render_template('search.html', error=str(e), query=query)

@app.route('/list')
def anime_list():
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/list",
            'anime_list',
            timeout=10,
            cache_type='long'
        )
        anime_list = data.get('data', {}).get('list', [])
        return render_template('anime_list.html', anime_list=anime_list)
    except Exception as e:
        return render_template('anime_list.html', error=str(e))

@app.route('/genres')
def genres():
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/genres",
            'genres_list',
            timeout=10,
            cache_type='long'
        )
        genre_list = data.get('data', {}).get('genreList', [])
        return render_template('genres.html', genre_list=genre_list)
    except Exception as e:
        return render_template('genres.html', error=str(e))

@app.route('/genres/<genre_id>')
def genre_detail(genre_id):
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/genres/{genre_id}?page={page}",
            f'genre_{genre_id}_page_{page}',
            timeout=10,
            cache_type='medium'
        )
        anime_list = data.get('data', {}).get('animeList', [])
        pagination = data.get('pagination', {})
        genre_title = genre_id.replace('-', ' ').title()
        return render_template('home.html', 
                             recent=anime_list, 
                             page_title=f"Genre: {genre_title}",
                             pagination=pagination,
                             current_route=f'genres/{genre_id}')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/batch')
def batch():
    page = request.args.get('page', 1, type=int)
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/batch?page={page}",
            f'batch_page_{page}',
            timeout=10,
            cache_type='short'
        )
        batch_list = data.get('data', {}).get('batchList', [])
        pagination = data.get('pagination', {})
        return render_template('home.html', 
                             batch_list=batch_list, 
                             page_title="Batch Download",
                             pagination=pagination,
                             current_route='batch')
    except Exception as e:
        return render_template('home.html', error=str(e))

@app.route('/batch/<batch_id>')
def batch_detail(batch_id):
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/batch/{batch_id}",
            f'batch_detail_{batch_id}',
            timeout=10,
            cache_type='long'
        )
        batch = data.get('data', {})
        return render_template('anime_detail.html', anime=batch, is_batch=True)
    except Exception as e:
        return render_template('anime_detail.html', error=str(e))

@app.route('/bookmark')
def bookmark():
    return render_template('bookmark.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/anime/<anime_id>')
def anime_detail(anime_id):
    try:
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/anime/{anime_id}",
            f'anime_{anime_id}',
            timeout=10,
            cache_type='medium'
        )
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
        data = get_cached_or_fetch(
            f"{API_BASE}/anime/samehadaku/episode/{episode_id}",
            f'episode_{episode_id}',
            timeout=10,
            cache_type='long'
        )
        episode = data.get('data', {})
        
        if episode and episode.get('animeId'):
            try:
                anime_data = get_cached_or_fetch(
                    f"{API_BASE}/anime/samehadaku/anime/{episode['animeId']}",
                    f"anime_{episode['animeId']}",
                    timeout=10,
                    cache_type='medium'
                )
                
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
        # Don't cache server URLs (they might expire)
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