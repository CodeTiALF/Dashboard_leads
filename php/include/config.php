<?php
// Configurações do projeto
define('CSV_FILE', __DIR__ . '/../leads.csv'); // Caminho absoluto para o arquivo CSV local
define('CSV_DELIMITER', ';'); // Delimitador do arquivo CSV

// Função para formatar datas
function formatDate($date) {
    if (empty($date)) return '';
    $timestamp = strtotime($date);
    return $timestamp ? date('d/m/Y', $timestamp) : '';
}

// Configurações de fuso horário
date_default_timezone_set('America/Sao_Paulo');
?>