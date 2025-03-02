<?php
// Caminho da requisição
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Se a URI termina com barra ou é raiz, servir o index.html da pasta public
if ($uri === '/' || $uri === '' || $uri === '/public/' || $uri === '/public') {
    $indexFile = __DIR__ . '/public/index.html';
    if (file_exists($indexFile)) {
        header('Content-Type: text/html');
        readfile($indexFile);
        exit;
    }
}

// Se for uma requisição para a API (include/process_csv.php)
if (strpos($uri, '/include/process_csv.php') !== false) {
    require_once __DIR__ . '/include/process_csv.php';
    exit;
}

// Caminho real do arquivo solicitado
$file = __DIR__ . $uri;

// Se o arquivo não existir
if (!file_exists($file)) {
    http_response_code(404);
    echo "404 - Arquivo não encontrado";
    exit;
}

// Define o tipo de conteúdo baseado na extensão do arquivo
$extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$content_types = [
    'html' => 'text/html',
    'css'  => 'text/css',
    'js'   => 'application/javascript',
    'json' => 'application/json',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif'  => 'image/gif',
    'svg'  => 'image/svg+xml'
];

if (isset($content_types[$extension])) {
    header('Content-Type: ' . $content_types[$extension]);
}

// Se for um arquivo regular, servir o conteúdo
if (is_file($file)) {
    readfile($file);
} else {
    http_response_code(404);
    echo "404 - Arquivo não encontrado";
}