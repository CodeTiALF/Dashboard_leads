<?php
require_once 'config.php';

/**
 * Lê e processa o arquivo CSV
 * @return array Array com os dados processados do CSV
 */
function processCSV() {
    $results = [];
    
    if (!file_exists(CSV_FILE)) {
        return $results;
    }
    
    // Abre o arquivo CSV
    if (($handle = fopen(CSV_FILE, "r")) !== FALSE) {
        // Lê a primeira linha como cabeçalho
        $headers = fgetcsv($handle, 0, CSV_DELIMITER);
        
        // Se o arquivo tiver BOM, remover do primeiro item do cabeçalho
        if (isset($headers[0]) && strpos($headers[0], "\xEF\xBB\xBF") === 0) {
            $headers[0] = str_replace("\xEF\xBB\xBF", '', $headers[0]);
        }
        
        // Processa cada linha do arquivo
        while (($data = fgetcsv($handle, 0, CSV_DELIMITER)) !== FALSE) {
            if (count($data) >= count($headers)) {
                $row = [];
                foreach ($headers as $index => $key) {
                    $row[$key] = isset($data[$index]) ? trim($data[$index]) : '';
                }
                $results[] = $row;
            }
        }
        
        fclose($handle);
    }
    
    return $results;
}

/**
 * Filtra os dados por intervalo de datas
 * @param array $data Dados a serem filtrados
 * @param string $startDate Data inicial (YYYY-MM-DD)
 * @param string $endDate Data final (YYYY-MM-DD)
 * @return array Dados filtrados
 */
function filterDataByDateRange($data, $startDate, $endDate) {
    if (empty($startDate) || empty($endDate) || !is_array($data)) {
        return $data;
    }
    
    // Converter strings para timestamps
    $startTimestamp = strtotime($startDate);
    $endTimestamp = strtotime($endDate . ' 23:59:59'); // Fim do dia
    
    if ($startTimestamp === false || $endTimestamp === false) {
        return $data;
    }
    
    return array_filter($data, function($lead) use ($startTimestamp, $endTimestamp) {
        if (empty($lead['DataEntrada'])) {
            return false;
        }
        
        $leadTimestamp = strtotime($lead['DataEntrada']);
        if ($leadTimestamp === false) {
            return false;
        }
        
        return ($leadTimestamp >= $startTimestamp && $leadTimestamp <= $endTimestamp);
    });
}

/**
 * Retorna os dados em formato JSON baseado nos parâmetros da requisição
 */
if (isset($_GET['action']) && $_GET['action'] === 'get_data') {
    header('Content-Type: application/json');
    
    $data = processCSV();
    
    // Aplicar filtro de data se fornecido
    if (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $startDate = $_GET['start_date'];
        $endDate = $_GET['end_date'];
        $data = filterDataByDateRange($data, $startDate, $endDate);
    }
    
    echo json_encode(array_values($data));
    exit;
}

/**
 * Retorna as datas mínima e máxima dos registros
 */
if (isset($_GET['action']) && $_GET['action'] === 'get_date_range') {
    header('Content-Type: application/json');
    
    $data = processCSV();
    $dates = [];
    
    foreach ($data as $lead) {
        if (!empty($lead['DataEntrada'])) {
            $dateTimestamp = strtotime($lead['DataEntrada']);
            if ($dateTimestamp !== false) {
                $dates[] = $dateTimestamp;
            }
        }
    }
    
    $result = [
        'min_date' => !empty($dates) ? date('Y-m-d', min($dates)) : null,
        'max_date' => !empty($dates) ? date('Y-m-d', max($dates)) : null
    ];
    
    echo json_encode($result);
    exit;
}

/**
 * Verifica se o arquivo CSV foi modificado desde o último pedido
 */
if (isset($_GET['action']) && $_GET['action'] === 'check_update') {
    header('Content-Type: application/json');
    
    $lastModified = filemtime(CSV_FILE);
    $clientLastModified = isset($_GET['last_modified']) ? intval($_GET['last_modified']) : 0;
    
    echo json_encode([
        'changed' => $lastModified > $clientLastModified,
        'last_modified' => $lastModified
    ]);
    exit;
}
?>