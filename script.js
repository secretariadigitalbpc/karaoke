let player;
let playlist = [];
let currentVideoIndex = 0;

// 1. Esta função cria o <iframe> (o player de vídeo) depois que o código da API é baixado.
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtubePlayer', {
        height: '100%',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 2. A API chamará esta função quando o player de vídeo estiver pronto.
function onPlayerReady(event) {
    // O player está pronto. Podemos adicionar listeners aos nossos botões agora.
    document.getElementById('prev-video-btn').addEventListener('click', () => playVideo(currentVideoIndex - 1));
    document.getElementById('next-video-btn').addEventListener('click', () => playVideo(currentVideoIndex + 1));
}

// 3. A API chama esta função quando o estado do player muda.
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        // Quando o vídeo atual termina, toca o próximo da fila.
        playVideo(currentVideoIndex + 1);
    }
}

// 4. Função para tocar um vídeo da fila pelo seu índice.
function playVideo(index) {
    if (index >= 0 && index < playlist.length) {
        currentVideoIndex = index;
        const video = playlist[currentVideoIndex];
        player.loadVideoById(video.id);
        document.getElementById('playerModalLabel').textContent = video.title;
        updatePlayerButtons();
        highlightCurrentPlaylistItem();
    } else {
        // Se a playlist terminou, para o vídeo e fecha o modal
        const playerModal = bootstrap.Modal.getInstance(document.getElementById('playerModal'));
        player.stopVideo();
        if(playerModal) playerModal.hide();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const videoGallery = document.getElementById('video-gallery');
    const addVideoForm = document.getElementById('addVideoForm');
    const searchInput = document.getElementById('searchInput');
    const playerModal = document.getElementById('playerModal');
    const playlistItemsContainer = document.getElementById('playlist-items');
    const playlistCountBadge = document.getElementById('playlist-count');
    const playAllBtn = document.getElementById('play-all-btn');
    const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
    const videoUrlInput = document.getElementById('videoUrl');
    const playerModalLabel = document.getElementById('playerModalLabel');

    let allVideos = []; // Armazena todos os vídeos carregados

    // ---------- Persistência no GitHub Pages (localStorage) ----------
    function getStoredVideos() {
        try {
            return JSON.parse(localStorage.getItem('karaoke_videos')) || [];
        } catch (e) {
            return [];
        }
    }
    function saveVideos(videos) {
        localStorage.setItem('karaoke_videos', JSON.stringify(videos));
    }

    // Função para extrair o ID do vídeo do YouTube
    function getYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Função para criar o card de um vídeo
    function createVideoCard(video) {
        const videoId = getYouTubeID(video.url);
        if (!videoId) return '';

        // Adiciona um ID único do vídeo ao card para referência
        return `
            <div class="col-md-4 mb-4 video-item" data-internal-id="${video.id}">
                <div class="card video-card">
                     <div class="card-img-overlay d-flex justify-content-end align-items-start p-2" style="pointer-events: none;">
                        <button class="btn btn-sm btn-light edit-btn" data-bs-toggle="modal" data-bs-target="#editModal" style="pointer-events: all;"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn-danger add-to-queue-btn ms-2" data-video-id="${videoId}" data-video-title="${video.title}" style="pointer-events: all;">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                    <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="card-img-top" alt="${video.title}" data-video-id="${videoId}" data-video-title="${video.title}" data-bs-toggle="modal" data-bs-target="#playerModal">
                    <div class="card-body">
                        <h5 class="card-title">${video.title}</h5>
                        <p class="card-text"><small class="text-muted">${video.style || 'Sem estilo'}</small></p>
                    </div>
                </div>
            </div>
        `;
    }

    // Função para exibir os vídeos na galeria
    function displayVideos(videos) {
        videoGallery.innerHTML = videos.map(createVideoCard).join('') || '<p class="text-center text-muted col-12">Nenhum vídeo encontrado.</p>';
    }

    // Função para renderizar os botões de filtro
    function renderStyleFilters() {
        const styleFilters = document.getElementById('style-filters');
        const styles = [...new Set(allVideos.map(video => video.style))]; // Pega estilos únicos
        
        styleFilters.innerHTML = '<button class="btn btn-dark filter-btn active" data-style="all">Todos</button>'; // Botão "Todos"
        styles.forEach(style => {
            if(style) { // Garante que não cria botão para estilo vazio
                const btn = document.createElement('button');
                btn.className = 'btn btn-outline-dark filter-btn';
                btn.textContent = style;
                btn.dataset.style = style;
                styleFilters.appendChild(btn);
            }
        });

        // Adiciona evento de clique aos botões
        styleFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Desativa outros botões
                styleFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                // Ativa o botão clicado
                e.target.classList.add('active');

                const selectedStyle = e.target.dataset.style;
                filterVideosByStyle(selectedStyle);
            }
        });
    }

    // Função para filtrar vídeos por estilo
    function filterVideosByStyle(style) {
        if (style === 'all') {
            displayVideos(allVideos);
        } else {
            const filteredVideos = allVideos.filter(video => video.style === style);
            displayVideos(filteredVideos);
        }
        // Reseta a busca ao trocar de filtro
        searchInput.value = '';
    }

    // Função para carregar e exibir os vídeos a partir do localStorage
    function loadVideos() {
        allVideos = getStoredVideos().slice().reverse(); // mostra os mais recentes primeiro
        displayVideos(allVideos);
        renderStyleFilters();
    }

    // Evento de submissão do formulário
    addVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('videoTitle').value;
        const style = document.getElementById('videoStyle').value;
        const url = document.getElementById('videoUrl').value;

        if (!getYouTubeID(url)) {
            alert('Por favor, insira uma URL válida do YouTube.');
            return;
        }

        const newVideo = { title, style, url };

        const videos = getStoredVideos();
        const videoWithId = { ...newVideo, id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) };
        videos.push(videoWithId);
        saveVideos(videos);
        addVideoForm.reset();
        loadVideos();
    });

    // Lógica da busca
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        // Reseta o filtro de estilo ao pesquisar
        document.querySelector('.filter-btn.active')?.classList.remove('active');
        document.querySelector('.filter-btn[data-style="all"]').classList.add('active');

        const filteredVideos = allVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm)
        );
        displayVideos(filteredVideos);
    });

    // Lógica para adicionar à fila, tocar vídeo único e editar
    videoGallery.addEventListener('click', e => {
        const addToQueueBtn = e.target.closest('.add-to-queue-btn');
        const img = e.target.closest('img');
        const editBtn = e.target.closest('.edit-btn');

        if (addToQueueBtn) {
            const videoId = addToQueueBtn.dataset.videoId;
            const videoTitle = addToQueueBtn.dataset.videoTitle;
            addToPlaylist({ id: videoId, title: videoTitle });
        } else if (img) {
            const videoId = img.dataset.videoId;
            const videoTitle = img.dataset.videoTitle;
            playlist = [{ id: videoId, title: videoTitle }];
            playVideo(0);
        } else if (editBtn) {
            const videoItem = e.target.closest('.video-item');
            const internalId = videoItem.dataset.internalId;
            const videoData = allVideos.find(v => v.id === internalId);
            if(videoData) {
                openEditModal(videoData);
            }
        }
    });

    // Lógica da Fila de Reprodução
    function addToPlaylist(video) {
        if (!playlist.find(v => v.id === video.id)) {
            playlist.push(video);
            renderPlaylist();
        }
    }

    function removeFromPlaylist(videoId) {
        playlist = playlist.filter(v => v.id !== videoId);
        renderPlaylist();
    }

    function renderPlaylist() {
        playlistItemsContainer.innerHTML = '';
        if (playlist.length === 0) {
            playlistItemsContainer.innerHTML = '<li class="list-group-item text-muted">A fila está vazia.</li>';
        } else {
            playlist.forEach((video, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.dataset.index = index;
                li.innerHTML = `
                    <span>${video.title}</span>
                    <i class="bi bi-x-lg text-danger remove-from-playlist-btn" data-video-id="${video.id}"></i>
                `;
                playlistItemsContainer.appendChild(li);
            });
        }
        updatePlaylistControls();
    }

    function updatePlaylistControls() {
        playlistCountBadge.textContent = playlist.length;
        const hasItems = playlist.length > 0;
        playAllBtn.disabled = !hasItems;
        clearPlaylistBtn.disabled = !hasItems;
    }

    function updatePlayerButtons() {
        document.getElementById('prev-video-btn').disabled = currentVideoIndex <= 0;
        document.getElementById('next-video-btn').disabled = currentVideoIndex >= playlist.length - 1;
    }

    function highlightCurrentPlaylistItem() {
        document.querySelectorAll('#playlist-items li').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.index) === currentVideoIndex) {
                item.classList.add('active');
            }
        });
    }

    playAllBtn.addEventListener('click', () => {
        if (playlist.length > 0) playVideo(0);
    });

    clearPlaylistBtn.addEventListener('click', () => {
        playlist = [];
        renderPlaylist();
    });

    playlistItemsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-from-playlist-btn')) {
            removeFromPlaylist(e.target.dataset.videoId);
        }
    });

    playerModal.addEventListener('hide.bs.modal', () => {
        if(player) player.stopVideo();
    });

    // Lógica do Modal de Edição
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editVideoForm = document.getElementById('editVideoForm');

    function openEditModal(video) {
        document.getElementById('editVideoId').value = video.id;
        document.getElementById('editVideoTitle').value = video.title;
        document.getElementById('editVideoStyle').value = video.style || '';
        document.getElementById('editVideoUrl').value = video.url;
    }

    editVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const videoData = {
            id: document.getElementById('editVideoId').value,
            title: document.getElementById('editVideoTitle').value,
            style: document.getElementById('editVideoStyle').value,
            url: document.getElementById('editVideoUrl').value
        };

        const videos = getStoredVideos();
        const idx = videos.findIndex(v => v.id === videoData.id);
        if (idx !== -1) {
            videos[idx] = videoData;
            saveVideos(videos);
            editModal.hide();
            loadVideos();
        } else {
            alert('Vídeo não encontrado.');
        }
    });

    // Lógica para buscar título ao colar URL
    videoUrlInput.addEventListener('paste', (e) => {
        // Um pequeno atraso para garantir que o valor do input foi atualizado
        setTimeout(async () => {
            const url = e.target.value;
            const videoId = getYouTubeID(url);

            if (videoId) {
                const videoTitleInput = document.getElementById('videoTitle');
                const originalPlaceholder = videoTitleInput.placeholder;
                videoTitleInput.value = '';
                videoTitleInput.placeholder = 'Buscando título...';
                videoTitleInput.disabled = true;

                try {
                    // Usamos um serviço público para obter os dados do vídeo sem precisar de API Key
                    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                    const data = await response.json();

                    if (response.ok && data.title) {
                        videoTitleInput.value = data.title;
                    } else {
                        videoTitleInput.placeholder = 'Não foi possível buscar o título.';
                    }
                } catch (error) {
                    console.error('Erro ao buscar título do vídeo:', error);
                    videoTitleInput.placeholder = 'Erro ao buscar título.';
                } finally {
                    videoTitleInput.disabled = false;
                    if (!videoTitleInput.value) {
                         videoTitleInput.placeholder = originalPlaceholder;
                    }
                }
            }
        }, 100);
    });

    // Carrega os vídeos ao iniciar a página
    loadVideos();
});
