<?php
// Configurações do servidor
$host = '172.29.1.134';  // IP específico
$port = 8011;            // Porta do servidor
$root = __DIR__;         // Diretório raiz do projeto

// Mensagem de inicialização
echo "Iniciando servidor PHP...\n";
echo "Você pode acessar o dashboard em:\n";
echo "http://$host:$port\n\n";
echo "Pressione Ctrl+C para parar o servidor\n";

// Comando para iniciar o servidor PHP
$command = sprintf(
    'php -S %s:%d -t %s %s/router.php',
    $host,
    $port,
    escapeshellarg($root),
    escapeshellarg($root)
);

// Executa o servidor
system($command);