<?php
require __DIR__ . '/vendor/autoload.php';

use KHQR\BakongKHQR;
use KHQR\Helpers\KHQRData;
use KHQR\Models\IndividualInfo;

// Load app settings from config.json.
$config = json_decode((string) file_get_contents(__DIR__ . '/config.json'), true);
if (!is_array($config)) {
    http_response_code(500);
    exit('config.json មិនត្រឹមត្រូវ');
}

// Make sure all required settings exist before running the demo.
foreach (['check_api_url', 'bakong_account_id', 'merchant_name', 'merchant_city', 'currency', 'expiration_minutes', 'qr_size'] as $key) {
    if (!isset($config[$key]) || $config[$key] === '') {
        http_response_code(500);
        exit("សូមបំពេញ {$key} នៅក្នុង config.json");
    }
}

// Read values from config.json into PHP variables.
$checkApiUrl = trim((string) $config['check_api_url']);
$bakongAccountId = trim((string) $config['bakong_account_id']);
$merchantName = trim((string) $config['merchant_name']);
$merchantCity = trim((string) $config['merchant_city']);
$currencyCode = strtoupper(trim((string) $config['currency']));
// KHQR SDK needs a numeric currency code, so we convert the JSON text here.
$currency = $currencyCode === 'KHR' ? KHQRData::CURRENCY_KHR : KHQRData::CURRENCY_USD;
$expirationMinutes = max(1, (int) $config['expiration_minutes']);
$qrSize = max(120, (int) $config['qr_size']);

// AJAX request: generate a dynamic KHQR and return QR image + md5.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['amount'])) {
    header('Content-Type: application/json');

    if ($bakongAccountId === '') {
        echo json_encode(['success' => false, 'error' => 'សូមបំពេញ bakong_account_id នៅក្នុង config.json']);
        exit;
    }

    $amount = (float) $_POST['amount'];
    if ($amount <= 0) {
        echo json_encode(['success' => false, 'error' => 'ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ']);
        exit;
    }

    try {
        // Bakong dynamic QR needs an expiration time in milliseconds.
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
            echo json_encode(['success' => false, 'error' => 'បង្កើត QR មិនបាន']);
            exit;
        }

        // We show the KHQR string as a QR image and keep md5 for payment checking.
        $qr = urlencode((string) $result->data['qr']);
        echo json_encode([
            'success' => true,
            'qr' => "https://api.qrserver.com/v1/create-qr-code/?size={$qrSize}x{$qrSize}&data={$qr}",
            'md5' => $result->data['md5'],
            'amount' => $amount
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }

    exit;
}

// AJAX request: check payment status through API_Check_Payment by md5.
if (isset($_GET['check_md5'])) {
    header('Content-Type: application/json');

    $md5 = strtolower(trim((string) $_GET['check_md5']));
    if (!preg_match('/^[a-f0-9]{32}$/', $md5)) {
        echo json_encode(['status' => 'UNPAID', 'success' => false, 'error' => 'MD5 មិនត្រឹមត្រូវ']);
        exit;
    }

    // Send md5 to your API_Check_Payment server. That server can run on Cambodia IP.
    $url = $checkApiUrl . (str_contains($checkApiUrl, '?') ? '&' : '?') . 'md5=' . urlencode($md5);
    $responseText = @file_get_contents($url);
    $response = json_decode($responseText ?: '{}', true);
    $paid = ($response['status'] ?? '') === 'PAID';

    echo json_encode([
        'status' => $paid ? 'PAID' : 'UNPAID',
        'success' => $responseText !== false
    ]);
    exit;
}
?>
<!doctype html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>បាគង QR សាកល្បង</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&display=swap" rel="stylesheet">
<style>
body {
    font-family: "Battambang", Arial, sans-serif;
    max-width: 640px;
    margin: 40px auto;
    padding: 0 16px;
    background: #f5f7fb;
    color: #222;
}
.box {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 24px;
}
input, button {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    margin-top: 10px;
    box-sizing: border-box;
}
button {
    background: #d62828;
    color: #fff;
    border: 0;
    cursor: pointer;
}
#result {
    margin-top: 20px;
}
img {
    max-width: 220px;
    display: block;
    margin: 16px auto;
}
.muted {
    color: #666;
    font-size: 14px;
}
.status {
    font-weight: bold;
    margin-top: 12px;
}
.paid {
    color: #15803d;
}
</style>
</head>
<body>
<div class="box">
    <h1>បាគង QR បង់ប្រាក់ស្វ័យប្រវត្តិ</h1>

    <form id="payForm">
        <label for="amountInput">ចំនួនទឹកប្រាក់ (<?php echo htmlspecialchars($currencyCode, ENT_QUOTES, 'UTF-8'); ?>)</label>
        <input id="amountInput" type="number" min="0.01" step="0.01" placeholder="បញ្ចូលចំនួនទឹកប្រាក់">
        <button type="submit">បង្កើត QR</button>
    </form>

    <div id="result"></div>
</div>

<script>
const form = document.getElementById('payForm');
const amountInput = document.getElementById('amountInput');
const result = document.getElementById('result');
const currency = <?php echo json_encode($currencyCode); ?>;
let timer = null;

// Step 1: generate QR when the form is submitted.
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearInterval(timer);

    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
        result.innerHTML = '<p>សូមបញ្ចូលចំនួនទឹកប្រាក់ឲ្យត្រឹមត្រូវ។</p>';
        return;
    }

    result.innerHTML = '<p>កំពុងបង្កើត QR...</p>';

    const response = await fetch('', {
        method: 'POST',
        body: new URLSearchParams({ amount })
    });
    const data = await response.json();

    if (!data.success) {
        result.innerHTML = `<p>${data.error || 'មិនអាចបង្កើត QR បានទេ'}</p>`;
        return;
    }

    result.innerHTML = `
        <img src="${data.qr}" alt="Bakong QR">
        <p>ចំនួនទឹកប្រាក់: ${Number(data.amount).toFixed(2)} ${currency}</p>
        <p>MD5: ${data.md5}</p>
        <p id="statusText" class="status">ស្ថានភាព: កំពុងរង់ចាំការទូទាត់...</p>
    `;

    const statusText = document.getElementById('statusText');

    // Step 2: poll the server every 5 seconds until the payment is completed.
    timer = setInterval(async () => {
        const check = await fetch(`?check_md5=${encodeURIComponent(data.md5)}`);
        const status = await check.json();

        if (status.success === false) {
            statusText.textContent = `ស្ថានភាព: ${status.error || 'ពិនិត្យមិនបាន'}`;
            clearInterval(timer);
            return;
        }

        const khmerStatus = status.status === 'PAID' ? 'បានបង់ប្រាក់រួច' : 'មិនទាន់បង់ប្រាក់';
        statusText.textContent = `ស្ថានភាព: ${khmerStatus}`;
        statusText.classList.toggle('paid', status.status === 'PAID');

        // Stop polling after the payment is successful.
        if (status.status === 'PAID') {
            clearInterval(timer);
        }
    }, 1000);
});
</script>
</body>
</html>
