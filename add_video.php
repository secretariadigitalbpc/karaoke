<?php
header('Content-Type: application/json');

$file = 'videos.json';

// Pega o conteúdo do POST
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['title']) || !isset($data['url']) || !isset($data['style'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Dados inválidos. Forneça título, URL e estilo.']);
    exit;
}

// Validação simples da URL
if (!filter_var($data['url'], FILTER_VALIDATE_URL) || !preg_match('/(youtube.com|youtu.be)/', $data['url'])) {
    http_response_code(400);
    echo json_encode(['message' => 'URL do YouTube inválida.']);
    exit;
}


// Lê o arquivo JSON atual
$videos = [];
if (file_exists($file)) {
    $videos = json_decode(file_get_contents($file), true);
    if ($videos === null) { // Trata erro de JSON inválido
        $videos = [];
    }
}

// Adiciona o novo vídeo
$newVideo = [
    'id' => uniqid(), // Adiciona um ID único
    'title' => htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
    'style' => htmlspecialchars($data['style'], ENT_QUOTES, 'UTF-8'),
    'url' => $data['url']
];

$videos[] = $newVideo;

// Salva o arquivo JSON
if (file_put_contents($file, json_encode($videos, JSON_PRETTY_PRINT))) {
    http_response_code(200);
    echo json_encode(['message' => 'Vídeo adicionado com sucesso!', 'video' => $newVideo]);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Erro ao salvar o arquivo.']);
}
?>
