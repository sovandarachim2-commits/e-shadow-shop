<?php
require __DIR__ . '/vendor/autoload.php';

use KHQR\BakongKHQR;
use KHQR\Helpers\KHQRData;
use KHQR\Models\IndividualInfo;

function fail(string $message, int $statusCode = 1): void
{
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit($statusCode);
}

$config = json_decode((string) file_get_contents(__DIR__ . '/config.json'), true);
if (!is_array($config)) {
    fail('Invalid Bakong config.json');
}

foreach (['bakong_account_id', 'merchant_name', 'merchant_city', 'currency', 'expiration_minutes', 'qr_size'] as $key) {
    if (!isset($config[$key]) || $config[$key] === '') {
        fail("Missing {$key} in config.json");
    }
}

$amount = isset($argv[1]) ? (float) $argv[1] : 0;
if ($amount <= 0) {
    fail('Invalid payment amount');
}

$currencyCode = strtoupper(trim((string) $config['currency']));
$currency = $currencyCode === 'KHR' ? KHQRData::CURRENCY_KHR : KHQRData::CURRENCY_USD;
$expirationMinutes = max(1, (int) $config['expiration_minutes']);
$qrSize = max(120, (int) $config['qr_size']);

try {
    $expiration = (string) floor((microtime(true) + ($expirationMinutes * 60)) * 1000);
    $info = new IndividualInfo(
        bakongAccountID: trim((string) $config['bakong_account_id']),
        merchantName: trim((string) $config['merchant_name']),
        merchantCity: trim((string) $config['merchant_city']),
        currency: $currency,
        amount: $amount,
        expirationTimestamp: $expiration
    );

    $result = BakongKHQR::generateIndividual($info);
    if (($result->status['code'] ?? 1) !== 0) {
        fail('Could not generate Bakong QR');
    }

    $qr = urlencode((string) $result->data['qr']);
    echo json_encode([
        'success' => true,
        'qr' => "https://api.qrserver.com/v1/create-qr-code/?size={$qrSize}x{$qrSize}&data={$qr}",
        'md5' => $result->data['md5'],
        'amount' => round($amount, 2),
        'currency' => $currencyCode,
        'merchantName' => trim((string) $config['merchant_name']),
        'expiresInMinutes' => $expirationMinutes
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    fail($error->getMessage());
}
