<?php
header('Content-Type: application/json');

$file = 'videos.json';

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id']) || !isset($data['title']) || !isset($data['style']) || !isset($data['url'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Dados inválidos. Forneça ID, título, estilo e URL.']);
    exit;
}

// Validate URL
if (filter_var($data['url'], FILTER_VALIDATE_URL) === false) {
    http_response_code(400);
    echo json_encode(['message' => 'URL inválida.']);
    exit;
}

$videos = [];
if (file_exists($file)) {
    $videos = json_decode(file_get_contents($file), true);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Arquivo de vídeos não encontrado.']);
    exit;
}

$videoFound = false;
foreach ($videos as $key => $video) {
    if ($video['id'] === $data['id']) {
        $videos[$key]['title'] = htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8');
        $videos[$key]['style'] = htmlspecialchars($data['style'], ENT_QUOTES, 'UTF-8');
        $videos[$key]['url'] = $data['url'];
        $videoFound = true;
        break;
    }
}

if (!$videoFound) {
    http_response_code(404);
    echo json_encode(['message' => 'Vídeo não encontrado.']);
    exit;
}

// Save the updated array to the file
if (file_put_contents($file, json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['message' => 'Vídeo atualizado com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Erro ao salvar o arquivo de vídeos.']);
}
?>
