<?php
function runLocalPaymentStatusScript(string $md5): ?array
{
    $phpPath = 'C:\\xampp\\php\\php.exe';
    $scriptPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'API_Check_Payment' . DIRECTORY_SEPARATOR . 'check_payment.php';
    if (!is_file($phpPath) || !is_file($scriptPath)) {
        return null;
    }

    $command = escapeshellarg($phpPath) . ' ' . escapeshellarg($scriptPath) . ' ' . escapeshellarg($md5);
    $output = shell_exec($command);
    if (!is_string($output) || trim($output) === '') {
        return null;
    }

    $decoded = json_decode($output, true);
    return is_array($decoded) ? $decoded : null;
}

function fail(string $message, int $statusCode = 1): void
{
    http_response_code(500);
    echo json_encode(['success' => false, 'status' => 'UNPAID', 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit($statusCode);
}

$config = json_decode((string) file_get_contents(__DIR__ . '/config.json'), true);
if (!is_array($config)) {
    fail('Invalid Bakong config.json');
}

$checkApiUrl = trim((string) ($config['check_api_url'] ?? ''));
if ($checkApiUrl === '') {
    fail('Missing check_api_url in config.json');
}

$md5 = strtolower(trim((string) ($argv[1] ?? '')));
if (!preg_match('/^[a-f0-9]{32}$/', $md5)) {
    fail('Invalid payment reference');
}

$response = runLocalPaymentStatusScript($md5);
if (!is_array($response)) {
    $url = $checkApiUrl . (str_contains($checkApiUrl, '?') ? '&' : '?') . 'md5=' . urlencode($md5);
    $responseText = @file_get_contents($url);
    if ($responseText === false) {
        fail('Could not reach the Bakong payment status API');
    }

    $response = json_decode($responseText, true);
    if (!is_array($response)) {
        fail('Invalid response from the Bakong payment status API');
    }
}

$paid = ($response['status'] ?? '') === 'PAID';

echo json_encode([
    'success' => true,
    'status' => $paid ? 'PAID' : 'UNPAID'
], JSON_UNESCAPED_UNICODE);
