<?php
header('Content-Type: application/json');

$file = 'videos.json';

if (file_exists($file)) {
    // Lê e inverte o array para mostrar os mais recentes primeiro
    $videos = json_decode(file_get_contents($file), true);
    if ($videos === null) {
        echo json_encode([]);
    } else {
        echo json_encode(array_reverse($videos));
    }
} else {
    // Se o arquivo não existe, retorna um array vazio
    echo json_encode([]);
}
?>
