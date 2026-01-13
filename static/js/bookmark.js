// Bookmark Management System for DayyStream
// Clean, modular, and fully functional bookmark system

(function() {
    'use strict';
    
    const BOOKMARKS_KEY = 'dayystream_bookmarks';

    // ============================================
    // CORE BOOKMARK FUNCTIONS
    // ============================================

    // Get bookmarks from localStorage
    function getBookmarks() {
        try {
            const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
            // Filter out any invalid bookmarks without animeId
            return bookmarks.filter(b => b.animeId && b.animeId.trim() !== '');
        } catch (e) {
            console.error('Error reading bookmarks:', e);
            return [];
        }
    }

    // Save bookmarks to localStorage
    function saveBookmarks(bookmarks) {
        try {
            // Clean bookmarks before saving
            const cleanBookmarks = bookmarks.filter(b => b.animeId && b.animeId.trim() !== '');
            localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(cleanBookmarks));
            updateBookmarkCounter();
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error('Error saving bookmarks:', e);
        }
    }

    // Check if anime is bookmarked
    function isBookmarked(animeId) {
        if (!animeId) return false;
        const bookmarks = getBookmarks();
        return bookmarks.some(b => b.animeId === animeId);
    }

    // Add to bookmarks
    function addToBookmarks(animeData) {
        if (!animeData.animeId || animeData.animeId.trim() === '') {
            console.error('Cannot bookmark: Invalid animeId', animeData);
            showNotification('Error: Invalid anime data', 'error');
            return false;
        }

        const bookmarks = getBookmarks();
        
        // Check if already bookmarked
        if (bookmarks.some(b => b.animeId === animeData.animeId)) {
            showNotification('Already in bookmarks', 'info');
            return false;
        }

        // Add new bookmark at the beginning with complete data
        const bookmarkData = {
            animeId: animeData.animeId,
            title: animeData.title || 'Unknown Title',
            poster: animeData.poster || '',
            score: animeData.score || '',
            type: animeData.type || '',
            status: animeData.status || '', // Make sure status is saved
            addedDate: Date.now()
        };
        
        console.log('Saving bookmark with data:', bookmarkData); // Debug log
        
        bookmarks.unshift(bookmarkData);
        saveBookmarks(bookmarks);
        showNotification('Added to bookmarks', 'success');
        return true;
    }

    // Remove from bookmarks
    function removeFromBookmarks(animeId) {
        if (!animeId) return false;
        
        const bookmarks = getBookmarks();
        const filtered = bookmarks.filter(b => b.animeId !== animeId);
        
        if (filtered.length === bookmarks.length) {
            return false; // Nothing was removed
        }
        
        saveBookmarks(filtered);
        
        // Refresh bookmarks page if currently showing
        if (window.location.pathname === '/bookmark') {
            displayBookmarks();
        }
        
        return true;
    }

    // Clear all bookmarks with custom modal
    function clearAllBookmarks() {
        showConfirmModal(
            'Hapus Semua Bookmark?',
            'Semua anime yang telah kamu bookmark akan dihapus. Tindakan ini tidak dapat dibatalkan.',
            () => {
                localStorage.removeItem(BOOKMARKS_KEY);
                updateBookmarkCounter();
                
                if (window.location.pathname === '/bookmark') {
                    displayBookmarks();
                }
                
                showNotification('Semua bookmark telah dihapus', 'success');
            }
        );
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    // Update bookmark counter in sidebar
    function updateBookmarkCounter() {
        const bookmarks = getBookmarks();
        const count = bookmarks.length;
        
        const badge = document.getElementById('bookmarkBadge');
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Display bookmarks on bookmark page
    function displayBookmarks() {
        const grid = document.getElementById('bookmarkGrid');
        const emptyState = document.getElementById('emptyState');
        const noResults = document.getElementById('noResults');
        const bookmarkCount = document.getElementById('bookmarkCount');
        
        if (!grid) return; // Not on bookmark page
        
        const bookmarks = getBookmarks();
        
        // Update count
        if (bookmarkCount) {
            bookmarkCount.textContent = `${bookmarks.length} anime`;
        }
        
        // Show empty state if no bookmarks
        if (bookmarks.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            if (noResults) noResults.style.display = 'none';
            return;
        }
        
        // Show grid
        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
        
        // Clear grid
        grid.innerHTML = '';
        
        // Render each bookmark
        bookmarks.forEach(anime => {
            const cardLink = createBookmarkCard(anime);
            grid.appendChild(cardLink);
        });
    }

    // Create bookmark card element
    function createBookmarkCard(anime) {
        // Debug log
        console.log('Creating card for anime:', anime.title, 'Status:', anime.status);
        
        // Create card wrapper (clickable link)
        const cardLink = document.createElement('a');
        cardLink.href = `/anime/${anime.animeId}`;
        cardLink.className = 'card-link';
        cardLink.style.position = 'relative';
        cardLink.style.textDecoration = 'none';
        cardLink.style.color = 'inherit';
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-bookmark-btn';
        removeBtn.title = 'Hapus dari bookmark';
        removeBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        
        // Prevent card click when clicking remove button
        removeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            showConfirmModal(
                'Hapus dari bookmark?',
                `Apakah kamu yakin ingin menghapus "${anime.title}" dari bookmark?`,
                () => {
                    removeFromBookmarks(anime.animeId);
                    showNotification('Dihapus dari bookmark', 'success');
                }
            );
        });
        
        // Create card content
        const card = document.createElement('div');
        card.className = 'anime-card';
        
        // Poster
        const poster = document.createElement('div');
        poster.className = 'anime-poster';
        
        const img = document.createElement('img');
        img.src = anime.poster || 'https://via.placeholder.com/300x400?text=No+Image';
        img.alt = anime.title;
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/300x400?text=No+Image';
        };
        
        poster.appendChild(img);
        
        // Create badge container for status badge only
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'badge-container';
        
        // ONLY add status badge (if exists)
        if (anime.status) {
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge ${getBadgeClass(anime.status)}`;
            statusBadge.textContent = anime.status;
            badgeContainer.appendChild(statusBadge);
        }
        
        // Only add container if it has badges
        if (badgeContainer.children.length > 0) {
            poster.appendChild(badgeContainer);
        }
        
        // Info
        const info = document.createElement('div');
        info.className = 'anime-info';
        
        const title = document.createElement('div');
        title.className = 'anime-title';
        title.textContent = anime.title;
        
        const meta = document.createElement('div');
        meta.className = 'anime-meta';
        
        if (anime.score) {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'meta-item';
            scoreItem.textContent = `⭐ ${anime.score}`;
            meta.appendChild(scoreItem);
        }
        
        if (anime.type) {
            const typeItem = document.createElement('div');
            typeItem.className = 'meta-item';
            typeItem.textContent = `📺 ${anime.type}`;
            meta.appendChild(typeItem);
        }
        
        info.appendChild(title);
        if (meta.children.length > 0) {
            info.appendChild(meta);
        }
        
        // Add date added
        if (anime.addedDate) {
            const dateDiv = document.createElement('div');
            dateDiv.style.cssText = 'font-size: 11px; color: var(--text-secondary); margin-top: 8px;';
            dateDiv.textContent = `Ditambahkan: ${formatDate(anime.addedDate)}`;
            info.appendChild(dateDiv);
        }
        
        // Assemble card
        card.appendChild(poster);
        card.appendChild(info);
        
        cardLink.appendChild(removeBtn);
        cardLink.appendChild(card);
        
        return cardLink;
    }

    // Get badge class based on status
    function getBadgeClass(status) {
        if (status === 'Completed') return 'badge-completed';
        if (status === 'Ongoing') return 'badge-ongoing';
        return 'badge-recent';
    }

    // Format date
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Hari ini';
        if (days === 1) return 'Kemarin';
        if (days < 7) return `${days} hari lalu`;
        if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
        if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
        
        return date.toLocaleDateString('id-ID', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Show custom confirm modal
    function showConfirmModal(title, message, onConfirm) {
        // Remove existing modal if any
        const existing = document.querySelector('.confirm-modal-overlay');
        if (existing) existing.remove();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        
        modal.innerHTML = `
            <div class="confirm-modal-header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-modal-body">
                <p>${message}</p>
            </div>
            <div class="confirm-modal-footer">
                <button class="confirm-btn confirm-btn-cancel">Batal</button>
                <button class="confirm-btn confirm-btn-ok">Oke</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        // Handle cancel
        const cancelBtn = modal.querySelector('.confirm-btn-cancel');
        cancelBtn.addEventListener('click', () => {
            closeModal(overlay);
        });
        
        // Handle confirm
        const okBtn = modal.querySelector('.confirm-btn-ok');
        okBtn.addEventListener('click', () => {
            closeModal(overlay);
            if (onConfirm) onConfirm();
        });
        
        // Handle overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
        
        function closeModal(overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.bookmark-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'bookmark-notification';
        
        const bgColor = type === 'success' ? '#27ae60' : 
                       type === 'error' ? '#e74c3c' : 
                       '#3498db';
        
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, ${bgColor}, ${adjustBrightness(bgColor, 20)});
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Adjust color brightness
    function adjustBrightness(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
            (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
            .toString(16).slice(1);
    }

    // ============================================
    // DETAIL PAGE BOOKMARK BUTTON
    // ============================================

    function initDetailPageBookmark() {
        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (!bookmarkBtn) return; // Not on detail page
        
        // Get anime data from page
        const animeData = window.animeData;
        if (!animeData || !animeData.animeId) {
            console.error('Anime data not found or invalid');
            return;
        }
        
        // Update button state
        updateBookmarkButton(animeData.animeId);
        
        // Add click handler
        bookmarkBtn.addEventListener('click', function() {
            toggleBookmark(animeData);
        });
    }

    function updateBookmarkButton(animeId) {
        const btn = document.getElementById('bookmarkBtn');
        const icon = document.getElementById('bookmarkIcon');
        const text = document.getElementById('bookmarkText');
        
        if (!btn) return;
        
        const bookmarked = isBookmarked(animeId);
        
        if (bookmarked) {
            btn.classList.add('bookmarked');
            if (icon) icon.setAttribute('fill', 'currentColor');
            if (text) text.textContent = 'Bookmarked';
        } else {
            btn.classList.remove('bookmarked');
            if (icon) icon.setAttribute('fill', 'none');
            if (text) text.textContent = 'Bookmark';
        }
    }

    function toggleBookmark(animeData) {
        if (!animeData || !animeData.animeId) {
            showNotification('Error: Invalid anime data', 'error');
            return;
        }
        
        const bookmarked = isBookmarked(animeData.animeId);
        
        if (bookmarked) {
            removeFromBookmarks(animeData.animeId);
            showNotification('Dihapus dari bookmark', 'info');
        } else {
            addToBookmarks(animeData);
        }
        
        updateBookmarkButton(animeData.animeId);
    }

    // ============================================
    // SEARCH & FILTER FOR BOOKMARK PAGE
    // ============================================

    function initBookmarkPageFeatures() {
        const searchInput = document.getElementById('searchBookmark');
        const sortSelect = document.getElementById('sortBookmark');
        const clearBtn = document.getElementById('clearAllBookmarks');
        
        if (searchInput) {
            searchInput.addEventListener('input', filterBookmarks);
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', sortBookmarks);
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', clearAllBookmarks);
        }
    }

    function filterBookmarks() {
        const query = document.getElementById('searchBookmark').value.toLowerCase().trim();
        const cards = document.querySelectorAll('#bookmarkGrid .card-link');
        let visibleCount = 0;
        
        cards.forEach(card => {
            const title = card.querySelector('.anime-title').textContent.toLowerCase();
            
            if (!query || title.includes(query)) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update no results message
        const noResults = document.getElementById('noResults');
        const grid = document.getElementById('bookmarkGrid');
        
        if (visibleCount === 0 && cards.length > 0) {
            if (grid) grid.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
        } else {
            if (grid) grid.style.display = 'grid';
            if (noResults) noResults.style.display = 'none';
        }
    }

    function sortBookmarks() {
        const sortType = document.getElementById('sortBookmark').value;
        const bookmarks = getBookmarks();
        
        switch(sortType) {
            case 'newest':
                bookmarks.sort((a, b) => (b.addedDate || 0) - (a.addedDate || 0));
                break;
            case 'oldest':
                bookmarks.sort((a, b) => (a.addedDate || 0) - (b.addedDate || 0));
                break;
            case 'title':
                bookmarks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title-desc':
                bookmarks.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
        }
        
        saveBookmarks(bookmarks);
        displayBookmarks();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Always update counter
        updateBookmarkCounter();
        
        // Listen for storage changes from other tabs
        window.addEventListener('storage', function(e) {
            if (e.key === BOOKMARKS_KEY) {
                updateBookmarkCounter();
                
                if (window.location.pathname === '/bookmark') {
                    displayBookmarks();
                }
            }
        });
        
        // Init based on current page
        if (window.location.pathname === '/bookmark') {
            displayBookmarks();
            initBookmarkPageFeatures();
        } else if (window.location.pathname.startsWith('/anime/')) {
            initDetailPageBookmark();
        }
        
        // Add CSS animations
        addStyles();
    }

    function addStyles() {
        if (document.getElementById('bookmark-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'bookmark-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Badge Container - Vertical Layout with proper spacing */
            .badge-container {
                position: absolute;
                top: 8px;
                left: 8px;
                right: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 2;
                align-items: flex-start;
                pointer-events: none;
            }
            
            /* All badges same style */
            .badge {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                display: inline-block;
                pointer-events: auto;
            }
            
            /* Bookmark Badge */
            .badge-bookmark {
                background: linear-gradient(135deg, #ffd700, #ffb800);
                color: #1a1f2e;
            }
            
            /* Status Badges */
            .badge-ongoing {
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
            }
            
            .badge-completed {
                background: linear-gradient(135deg, #2ecc71, #27ae60);
                color: white;
            }
            
            .badge-recent {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
            }
            
            /* Remove button positioning */
            .remove-bookmark-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.7);
                border: none;
                color: white;
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                z-index: 3;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                width: 32px;
                height: 32px;
            }
            
            .remove-bookmark-btn:hover {
                background: var(--primary-color, #e74c3c);
                transform: scale(1.1);
            }
            
            /* Custom Confirm Modal */
            .confirm-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                padding: 20px;
            }
            
            .confirm-modal-overlay.active {
                opacity: 1;
            }
            
            .confirm-modal-overlay.active .confirm-modal {
                transform: scale(1);
                opacity: 1;
            }
            
            .confirm-modal {
                background: var(--bg-card, #1e293b);
                border-radius: 16px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                transform: scale(0.9);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
            }
            
            .confirm-modal-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            }
            
            .confirm-modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: var(--text-primary, #fff);
            }
            
            .confirm-modal-body {
                padding: 20px 24px;
            }
            
            .confirm-modal-body p {
                margin: 0;
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-secondary, #94a3b8);
            }
            
            .confirm-modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .confirm-btn {
                padding: 10px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                border: none;
                min-width: 90px;
            }
            
            .confirm-btn-cancel {
                background: rgba(148, 163, 184, 0.1);
                color: var(--text-secondary, #94a3b8);
                border: 1px solid rgba(148, 163, 184, 0.3);
            }
            
            .confirm-btn-cancel:hover {
                background: rgba(148, 163, 184, 0.2);
                border-color: rgba(148, 163, 184, 0.5);
            }
            
            .confirm-btn-ok {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
            .confirm-btn-ok:hover {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
                transform: translateY(-1px);
            }
            
            .confirm-btn-ok:active {
                transform: translateY(0);
            }
            
            @media (max-width: 480px) {
                .confirm-modal {
                    max-width: 100%;
                    margin: 0 16px;
                }
                
                .confirm-modal-header {
                    padding: 20px 20px 12px;
                }
                
                .confirm-modal-header h3 {
                    font-size: 18px;
                }
                
                .confirm-modal-body {
                    padding: 16px 20px;
                }
                
                .confirm-modal-footer {
                    padding: 12px 20px 20px;
                }
                
                .confirm-btn {
                    padding: 8px 20px;
                    font-size: 13px;
                    min-width: 80px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Make functions available globally for inline handlers
    window.DayystreamBookmarks = {
        add: addToBookmarks,
        remove: removeFromBookmarks,
        clearAll: clearAllBookmarks,
        isBookmarked: isBookmarked,
        getAll: getBookmarks
    };

})();