<?php
require __DIR__ . '/vendor/autoload.php';

use KHQR\BakongKHQR;
use KHQR\Helpers\KHQRData;
use KHQR\Models\IndividualInfo;

// Load bot + Bakong settings from config.json.
$config = json_decode((string) file_get_contents(__DIR__ . '/config.json'), true);
if (!is_array($config)) {
    http_response_code(500);
    exit('Invalid config.json');
}

// Make sure required settings exist.
foreach (['token', 'status_url', 'bakong_account_id', 'merchant_name', 'merchant_city', 'currency', 'expiration_minutes', 'qr_size', 'telegram_bot_token'] as $key) {
    if (!isset($config[$key]) || $config[$key] === '') {
        http_response_code(500);
        exit("Missing {$key} in config.json");
    }
}

$bakongToken = trim((string) $config['token']);
$statusUrl = trim((string) $config['status_url']);
$bakongAccountId = trim((string) $config['bakong_account_id']);
$merchantName = trim((string) $config['merchant_name']);
$merchantCity = trim((string) $config['merchant_city']);
$currencyCode = strtoupper(trim((string) $config['currency']));
$currency = $currencyCode === 'KHR' ? KHQRData::CURRENCY_KHR : KHQRData::CURRENCY_USD;
$expirationMinutes = max(1, (int) $config['expiration_minutes']);
$qrSize = max(120, (int) $config['qr_size']);
$telegramBotToken = trim((string) $config['telegram_bot_token']);

function telegramApi(string $botToken, string $method, array $data): array
{
    $ch = curl_init("https://api.telegram.org/bot{$botToken}/{$method}");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => $data,
    ]);

    $responseText = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    return [
        'success' => !$error,
        'data' => json_decode($responseText ?: '{}', true),
        'error' => $error
    ];
}

function sendTelegramMessage(string $botToken, int|string $chatId, string $text): void
{
    telegramApi($botToken, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $text
    ]);
}

function sendTelegramPhoto(string $botToken, int|string $chatId, string $photo, string $caption): void
{
    telegramApi($botToken, 'sendPhoto', [
        'chat_id' => $chatId,
        'photo' => $photo,
        'caption' => $caption
    ]);
}

function finishWebhookResponse(): void
{
    $body = 'OK';
    if (!headers_sent()) {
        header('Content-Type: text/plain; charset=UTF-8');
        header('Connection: close');
        header('Content-Length: ' . strlen($body));
    }

    echo $body;

    while (ob_get_level() > 0) {
        @ob_end_flush();
    }
    flush();

    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
}

function checkBakongPayment(string $md5, string $statusUrl, string $bakongToken): bool
{
    $ch = curl_init($statusUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $bakongToken,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode(['md5' => $md5]),
    ]);

    $responseText = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return false;
    }

    $response = json_decode($responseText ?: '{}', true);

    return ($response['responseCode'] ?? null) === 0 && !empty($response['data']['acknowledgedDateMs']);
}

function usageText(string $currencyCode): string
{
    return "សួស្តី\n\nប្រើពាក្យបញ្ជា:\n/pay 1\n/pay 2.50\n\nឧទាហរណ៍:\n/pay 1.00\n\nរូបិយប័ណ្ណ: {$currencyCode}";
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Telegram bot is ready.\nUse this file as Telegram webhook URL.";
    exit;
}

// Telegram sends update JSON to this webhook.
$update = json_decode((string) file_get_contents('php://input'), true);
$message = $update['message'] ?? null;
$chatId = $message['chat']['id'] ?? null;
$text = trim((string) ($message['text'] ?? ''));

if (!$chatId || $text === '') {
    finishWebhookResponse();
    exit;
}

if ($text === '/start' || $text === '/help') {
    sendTelegramMessage($telegramBotToken, $chatId, usageText($currencyCode));
    finishWebhookResponse();
    exit;
}

if (!preg_match('/^\/pay(?:@\w+)?\s+([0-9]+(?:\.[0-9]{1,2})?)$/', $text, $match)) {
    sendTelegramMessage($telegramBotToken, $chatId, usageText($currencyCode));
    finishWebhookResponse();
    exit;
}

$amount = (float) $match[1];
if ($amount <= 0) {
    sendTelegramMessage($telegramBotToken, $chatId, 'ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ');
    finishWebhookResponse();
    exit;
}

try {
    // Generate a dynamic KHQR and keep md5 for status checking.
    $expiration = (string) floor((microtime(true) + ($expirationMinutes * 60)) * 1000);
    $info = new IndividualInfo(
        bakongAccountID: $bakongAccountId,
        merchantName: $merchantName,
        merchantCity: $merchantCity,
        currency: $currency,
        amount: $amount,
        expirationTimestamp: $expiration
    );

    $result = BakongKHQR::generateIndividual($info);
    if (($result->status['code'] ?? 1) !== 0) {
        throw new RuntimeException('Generate QR failed');
    }

    $qr = urlencode((string) $result->data['qr']);
    $md5 = (string) $result->data['md5'];
    $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size={$qrSize}x{$qrSize}&data={$qr}";

    sendTelegramPhoto(
        $telegramBotToken,
        $chatId,
        $qrUrl,
        "សូមស្កេន QR ដើម្បីបង់ប្រាក់\nចំនួន: " . number_format($amount, 2) . " {$currencyCode}\nMD5: {$md5}"
    );
    sendTelegramMessage($telegramBotToken, $chatId, 'ស្ថានភាព: កំពុងពិនិត្យការទូទាត់រៀងរាល់ 1 វិនាទី...');

    // Answer Telegram first, then continue checking in the background.
    ignore_user_abort(true);
    @set_time_limit(($expirationMinutes * 60) + 10);
    finishWebhookResponse();

    $maxChecks = $expirationMinutes * 60;
    for ($i = 0; $i < $maxChecks; $i++) {
        sleep(1);

        if (checkBakongPayment($md5, $statusUrl, $bakongToken)) {
            sendTelegramMessage($telegramBotToken, $chatId, "ស្ថានភាព: បានបង់ប្រាក់រួច\nចំនួន: " . number_format($amount, 2) . " {$currencyCode}");
            exit;
        }
    }

    sendTelegramMessage($telegramBotToken, $chatId, 'ស្ថានភាព: មិនទាន់បង់ប្រាក់ ឬ QR ផុតកំណត់');
} catch (Throwable $e) {
    sendTelegramMessage($telegramBotToken, $chatId, 'មានបញ្ហា: ' . $e->getMessage());
    finishWebhookResponse();
}
