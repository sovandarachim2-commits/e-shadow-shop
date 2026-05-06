<?php
// Add CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Accept');

require_once 'vendor/autoload.php';
use KHQR\BakongKHQR;
use KHQR\Exceptions\KHQRException;

$log_file = __DIR__ . DIRECTORY_SEPARATOR . 'response.log';

$configPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'QR_Bakong_Generator' . DIRECTORY_SEPARATOR . 'config.json';
$config = is_file($configPath) ? json_decode((string) file_get_contents($configPath), true) : null;
if (!is_array($config)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Invalid QR_Bakong_Generator config.json',
        'success' => false
    ], JSON_PRETTY_PRINT);
    exit;
}

// Token for BakongKHQR
$token = trim((string) ($config['token'] ?? ''));
if ($token === '') {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Missing Bakong token in QR_Bakong_Generator config.json',
        'success' => false
    ], JSON_PRETTY_PRINT);
    exit;
}

$bakongKhqr = new BakongKHQR($token);

// Get and validate MD5
$md5Hash = $argv[1] ?? ($_GET['md5'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $md5Hash)) {
    http_response_code(400);
    $error_response = [
        'md5' => $md5Hash,
        'error' => 'Invalid or missing MD5 hash',
        'success' => false
    ];
    file_put_contents($log_file, date('Y-m-d H:i:s') . " - Invalid MD5: $md5Hash\n", FILE_APPEND);
    header('Content-Type: application/json');
    echo json_encode($error_response, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Check transaction status (isTest=false for production)
    $response = $bakongKhqr->checkTransactionByMD5($md5Hash, false);
    
    // Log response for debugging
    file_put_contents('response.log', date('Y-m-d H:i:s') . " - Response for MD5 {$md5Hash}: " . print_r($response, true) . "\n", FILE_APPEND);
    
    // Set output: default to UNPAID
    $output = ['md5' => $md5Hash, 'status' => 'UNPAID', 'success' => true];
    
    // Check if paid (acknowledgedDateMs exists)
    if (is_array($response) && $response['responseCode'] === 0 && !empty($response['data']['acknowledgedDateMs'])) {
        $output['status'] = 'PAID';
    }
    
    // Output JSON
    header('Content-Type: application/json');
    echo json_encode($output, JSON_PRETTY_PRINT);
} catch (KHQRException $e) {
    header('Content-Type: application/json');
    $error_response = [
        'md5' => $md5Hash,
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'success' => false
    ];
    file_put_contents($log_file, date('Y-m-d H:i:s') . " - Error for MD5 {$md5Hash}: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode($error_response, JSON_PRETTY_PRINT);
    
    if ($e->getCode() === 6) {
        $suggestion = ['suggestion' => 'Token expired. Renew it using BakongKHQR::renewToken("your_email") or register at https://api-bakong.nbc.gov.kh/register.'];
        echo json_encode($suggestion, JSON_PRETTY_PRINT);
    }
}
?>
