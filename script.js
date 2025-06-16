let player;
let playlist = []; // será carregado do localStorage após DOM pronto
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

// Configurações do Gist
const GIST_CONFIG = {
    token: localStorage.getItem('github_token') || '',
    gistId: localStorage.getItem('karaoke_gist_id') || '',
    filename: 'karaoke-data.json'
};

// Inicializa as configurações da UI
function initSettings() {
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const githubTokenInput = document.getElementById('githubToken');
    const saveSettingsBtn = document.getElementById('saveSettings');
    
    // Carrega o token salvo
    if (GIST_CONFIG.token) {
        githubTokenInput.value = GIST_CONFIG.token;
    }
    
    // Salva as configurações
    saveSettingsBtn.addEventListener('click', () => {
        const token = githubTokenInput.value.trim();
        if (token) {
            GIST_CONFIG.token = token;
            localStorage.setItem('github_token', token);
            settingsModal.hide();
            alert('Configurações salvas com sucesso!');
        } else {
            alert('Por favor, insira um token válido.');
        }
    });
    
    // Mostra o botão de configurações apenas se não estiver em produção
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        document.querySelector('a[data-bs-target="#settingsModal"]').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa as configurações
    initSettings();
    // Tenta carregar do localStorage primeiro para mostrar algo rápido
    loadFromLocalStorage();
    
    // Depois tenta sincronizar com o Gist
    if (GIST_CONFIG.gistId) {
        try {
            await loadFromGist();
        } catch (error) {
            console.error('Erro ao carregar do Gist:', error);
        }
    }
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
    const userNameInput = document.getElementById('userNameInput');

    let allVideos = []; // Armazena todos os vídeos carregados

    // Carrega playlist salva
    playlist = getStoredPlaylist();
    renderPlaylist();

        // Renderiza ranking ao iniciar
    renderRank();

    // Preenche nome salvo, se existir
    userNameInput.value = localStorage.getItem('karaoke_user_name') || '';

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
        // Salva também como último backup
        localStorage.setItem('last_karaoke_backup', JSON.stringify({
            videos: videos,
            lastUpdated: new Date().toISOString()
        }));
    }

    // Função para gerar nome do arquivo de backup com data atual
    function getBackupFilename() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        return `karaoke-backup-${dateStr}.json`;
    }

    // Função para salvar dados localmente e no Gist
    async function saveBackup(videos) {
        const data = {
            videos: videos,
            lastUpdated: new Date().toISOString()
        };
        
        // Salva no localStorage
        saveToLocalStorage(videos);
        
        try {
            // Tenta salvar no Gist
            await saveToGist(data);
            console.log('Dados salvos no Gist com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar no Gist, usando armazenamento local:', error);
            // Faz download local se falhar
            downloadBackup(data);
        }
        
        return { success: true };
    }
    
    // Função para salvar no Gist
    async function saveToGist(data) {
        if (!GIST_CONFIG.token) {
            throw new Error('Token do GitHub não configurado');
        }
        
        const gistData = {
            description: 'Backup Karaoke - ' + new Date().toLocaleString(),
            public: false,
            files: {}
        };
        
        gistData.files[GIST_CONFIG.filename] = {
            content: JSON.stringify(data, null, 2)
        };
        
        const url = GIST_CONFIG.gistId 
            ? `https://api.github.com/gists/${GIST_CONFIG.gistId}` // Atualiza Gist existente
            : 'https://api.github.com/gists'; // Cria novo Gist
            
        const response = await fetch(url, {
            method: GIST_CONFIG.gistId ? 'PATCH' : 'POST',
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(gistData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar no Gist');
        }
        
        const result = await response.json();
        if (!GIST_CONFIG.gistId) {
            GIST_CONFIG.gistId = result.id;
            localStorage.setItem('karaoke_gist_id', result.id);
        }
        
        return result;
    }
    
    // Função para carregar do Gist
    async function loadFromGist() {
        if (!GIST_CONFIG.gistId) return;
        
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Falha ao carregar do Gist');
        }
        
        const gist = await response.json();
        const file = gist.files[GIST_CONFIG.filename];
        
        if (!file) {
            throw new Error('Arquivo não encontrado no Gist');
        }
        
        const data = JSON.parse(file.content);
        if (data.videos && Array.isArray(data.videos)) {
            saveToLocalStorage(data.videos);
            return data.videos;
        }
        
        throw new Error('Formato de dados inválido no Gist');
    }
    
    // Função para fazer download do backup
    function downloadBackup(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getBackupFilename();
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Função para carregar do localStorage
    function loadFromLocalStorage() {
        const videos = getStoredVideos();
        if (videos.length > 0) {
            console.log('Carregando vídeos do localStorage');
            return videos;
        }
        return [];
    }
    
    // Função para salvar no localStorage
    function saveToLocalStorage(videos) {
        const data = {
            videos: videos,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('karaoke_videos', JSON.stringify(data));
        localStorage.setItem('last_karaoke_backup', JSON.stringify(data));
    }

    // ---------- Persistência da Playlist ----------
    function getStoredPlaylist() {
        try {
            return JSON.parse(localStorage.getItem('karaoke_playlist')) || [];
        } catch (e) {
            return [];
        }
    }
    function savePlaylist(list) {
        localStorage.setItem('karaoke_playlist', JSON.stringify(list));
    }

    // ---------- Ranking ----------

    function renderRank() {
    const rankListEl = document.getElementById('rank-list');
    if (!rankListEl) return;

    // Calcula o ranking diretamente a partir dos vídeos salvos, garantindo persistência
    const videos = getStoredVideos();
    const rank = {};
    videos.forEach(v => {
        if (v.addedBy) {
            rank[v.addedBy] = (rank[v.addedBy] || 0) + 1;
        }
    });

    const sorted = Object.entries(rank).sort((a, b) => b[1] - a[1]);
    rankListEl.innerHTML = sorted.length
        ? sorted.map(([name, count], i) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><strong>${i + 1}º</strong> <span class="badge bg-primary me-2">${count}</span></span><span>${name}</span></li>`).join('')
        : '<li class="list-group-item text-muted">Nenhum participante ainda.</li>';
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
                        <button class="btn btn-sm btn-warning delete-btn ms-2" data-internal-id="${video.id}" style="pointer-events: all;">
                            <i class="bi bi-trash-fill"></i>
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
        renderRank(); // Garante que o ranking é sempre atualizado após carregar vídeos
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

        const userName = userNameInput.value.trim() || 'Anônimo';
        const newVideo = { title, style, url, addedBy: userName };

        const videos = getStoredVideos();
        const videoWithId = { ...newVideo, id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) };
        videos.push(videoWithId);
        saveBackup([...videos, videoWithId]); // Salva novo backup com o vídeo adicionado
        localStorage.setItem('karaoke_user_name', userName);
        addVideoForm.reset();
        loadVideos(); // renderRank será chamado dentro de loadVideos

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
        const deleteBtn = e.target.closest('.delete-btn');
        const img = e.target.closest('img');
        const editBtn = e.target.closest('.edit-btn');

        if (addToQueueBtn) {
            const videoId = addToQueueBtn.dataset.videoId;
            const videoTitle = addToQueueBtn.dataset.videoTitle;
            addToPlaylist({ id: videoId, title: videoTitle });
        } else if (deleteBtn) {
            const pwd = prompt('Digite a senha para deletar:');
            if (pwd !== '1212') {
                alert('Senha incorreta!');
                return;
            }
            const videoItem = e.target.closest('.video-item');
            const internalId = videoItem.dataset.internalId;
            deleteVideo(internalId);
        } else if (img) {
            const videoId = img.dataset.videoId;
            const videoTitle = img.dataset.videoTitle;
            playlist = [{ id: videoId, title: videoTitle }];
            savePlaylist(playlist);
            playVideo(0);
        } else if (editBtn) {
            const videoItem = e.target.closest('.video-item');
            const internalId = videoItem.dataset.internalId;
            const videoData = allVideos.find(v => v.id === internalId);
            if(videoData) {
                const pwd = prompt('Digite a senha para editar:');
                if(pwd !== '1212') {
                    alert('Senha incorreta!');
                    return;
                }
                openEditModal(videoData);
                editModal.show();
            }
        }
    });

    // Lógica da Fila de Reprodução
    function addToPlaylist(video) {
        if (!playlist.find(v => v.id === video.id)) {
            playlist.push(video);
            renderPlaylist();
            savePlaylist(playlist);
        }
    }

    function removeFromPlaylist(videoId) {
        playlist = playlist.filter(v => v.id !== videoId);
        renderPlaylist();
        savePlaylist(playlist);
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
        savePlaylist(playlist);
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
        document.getElementById('editAddedBy').value = video.addedBy || '';
    }

    // Função para deletar vídeo com atualização de ranking
    function deleteVideo(internalId) {
        const videos = getStoredVideos();
        const idx = videos.findIndex(v => v.id === internalId);
        if (idx !== -1) {
            const [removed] = videos.splice(idx, 1);
            saveVideos(videos);

            renderRank();
            loadVideos();
        }
    }

    editVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();


        const videoData = {
            id: document.getElementById('editVideoId').value,
            title: document.getElementById('editVideoTitle').value,
            style: document.getElementById('editVideoStyle').value,
            url: document.getElementById('editVideoUrl').value,
            addedBy: document.getElementById('editAddedBy').value.trim() || 'Anônimo'
        };

        const videos = getStoredVideos();
        const idx = videos.findIndex(v => v.id === videoData.id);
        if (idx !== -1) {
            videos[idx] = { ...videos[idx], ...videoData };
            saveVideos(videos);
            editModal.hide();
            loadVideos(); // renderRank será chamado dentro de loadVideos
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

    // Exportar dados
    document.getElementById('exportBtn').addEventListener('click', () => {
        const videos = getStoredVideos();
        const data = {
            videos: videos,
            lastUpdated: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `karaoke-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Importar dados
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
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
                alert('Erro ao importar: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Limpa o input para permitir reimportação
    });
});
