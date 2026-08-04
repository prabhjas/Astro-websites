<?php
/**
 * Template Name: Conversion Template
 *
 * Enhanced hashed version for Kinza HR site.
 * Uses this file's own tokens/IDs and existing conditions.
 */

ini_set('display_errors', getenv('ENHANCED_DEBUG') === '1' ? '1' : '0');
error_reporting(E_ALL);
$DEBUG = true;

/* =========================
   PIPEDRIVE FETCH
========================= */
function curl_get_json($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_ENCODING => "",
        CURLOPT_HTTPHEADER => ["Accept: application/json"],
    ]);
    $body = curl_exec($ch);
    $error = null;
    if ($body === false) {
        $error = curl_error($ch);
    } else {
        $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if ($code < 200 || $code >= 300) {
            $error = "HTTP {$code} for {$url}";
        }
    }
    curl_close($ch);
    return ["body" => $body, "error" => $error];
}

/* =========================
   GOOGLE TOKEN REFRESH
========================= */
function refreshGoogleAdsToken($client_id, $client_secret, $refresh_token) {
    $tokenUrl = "https://accounts.google.com/o/oauth2/token";
    $data = [
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'refresh_token' => $refresh_token,
        'grant_type' => 'refresh_token'
    ];

    $options = [
        'http' => [
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data),
        ],
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($tokenUrl, false, $context);
    $tokens = json_decode($response, true);

    if (!isset($tokens['access_token'])) {
        throw new Exception("Error refreshing token: " . $response);
    }
    return $tokens['access_token'];
}

function isAccessTokenExpired($access_token) {
    return true;
}

/* =========================
   NORMALIZATION + HASHING
========================= */
function normalizeEmail($email) {
    $email = trim(strtolower((string)$email));
    if (strpos($email, '@') === false) return '';
    $parts = explode('@', $email, 2);
    if (count($parts) !== 2) return '';
    $local = $parts[0];
    $domain = $parts[1];
    if ($local === '' || $domain === '') return '';
    if ($domain === 'gmail.com' || $domain === 'googlemail.com') {
        $local = preg_replace('/\./', '', $local);
        $local = preg_replace('/\+.*/', '', $local);
    }
    return $local . '@' . $domain;
}

function hashEmail($email) {
    $normalized = normalizeEmail($email);
    return $normalized ? hash('sha256', $normalized) : '';
}

function normalizePhone($phone, $countryCode = '971') {
    $raw = trim((string)$phone);
    if ($raw === '') return '';
    $hasLeadingPlus = (substr($raw, 0, 1) === '+');
    $digits = preg_replace('/\D+/', '', $raw);
    if (!$digits) return '';
    if (substr($digits, 0, 2) === '00') return '+' . substr($digits, 2);
    if ($hasLeadingPlus) return '+' . $digits;
    if (substr($digits, 0, strlen($countryCode)) === $countryCode) return '+' . $digits;
    if (substr($digits, 0, 1) === '0') return '+' . $countryCode . substr($digits, 1);
    return '+' . $countryCode . $digits;
}

function hashPhone($phone) {
    $normalized = normalizePhone($phone);
    return $normalized ? hash('sha256', $normalized) : '';
}

function normalizeNamePart($namePart) {
    $value = trim(strtolower((string)$namePart));
    if ($value === '') return '';
    $value = preg_replace('/[^\p{L}\p{N}\s]/u', '', $value);
    $value = preg_replace('/\s+/', ' ', $value);
    return trim($value);
}

function splitName($fullName) {
    $name = trim((string)$fullName);
    if ($name === '') return ['', ''];
    $parts = preg_split('/\s+/', $name);
    if (!$parts || count($parts) === 0) return ['', ''];
    $first = $parts[0];
    $last = count($parts) > 1 ? $parts[count($parts) - 1] : '';
    return [$first, $last];
}

function hashNamePart($namePart) {
    $normalized = normalizeNamePart($namePart);
    return $normalized ? hash('sha256', $normalized) : '';
}

/* =========================
   SEND TO GOOGLE ADS
========================= */
function sendConversionsToGoogleAds($leads, $google_ads_url, &$google_ads_api_access_token, $conversion_action, $google_ads_developer_token, $google_ads_customer_id, $client_id, $client_secret, $refresh_token) {
    if (isAccessTokenExpired($google_ads_api_access_token)) {
        echo "<pre>[DEBUG] Refreshing Google Ads access token...</pre>";
        $google_ads_api_access_token = refreshGoogleAdsToken($client_id, $client_secret, $refresh_token);
    }

    $conversions = [];
    $withGclid = 0;
    $withIdentifiers = 0;

    foreach ($leads as $lead) {
        $rawDateTime = $lead['add_time'] ?? gmdate("Y-m-d H:i:s", strtotime("-60 seconds"));
        $dateTime = new DateTime($rawDateTime, new DateTimeZone("UTC"));
        $conversionDateTime = $dateTime->format("Y-m-d H:i:sP");

        $userIdentifiers = [];
        if (!empty($lead['email'])) {
            $hashedEmail = hashEmail($lead['email']);
            if ($hashedEmail) $userIdentifiers[] = ["hashed_email" => $hashedEmail];
        }
        if (!empty($lead['phone'])) {
            $hashedPhone = hashPhone($lead['phone']);
            if ($hashedPhone) $userIdentifiers[] = ["hashed_phone_number" => $hashedPhone];
        }
        if (!empty($lead['name'])) {
            [$firstNameRaw, $lastNameRaw] = splitName($lead['name']);
            $hashedFirstName = hashNamePart($firstNameRaw);
            $hashedLastName = hashNamePart($lastNameRaw);
            $addressInfo = [];
            if ($hashedFirstName) $addressInfo["hashed_first_name"] = $hashedFirstName;
            if ($hashedLastName) $addressInfo["hashed_last_name"] = $hashedLastName;
            if (!empty($addressInfo)) $userIdentifiers[] = ["address_info" => $addressInfo];
        }

        $conversion = [
            "conversion_action" => $conversion_action,
            "conversion_date_time" => $conversionDateTime,
        ];
        if (!empty($lead['gclid'])) {
            $conversion["gclid"] = $lead['gclid'];
            $withGclid++;
        }
        if (!empty($userIdentifiers)) {
            $conversion["user_identifiers"] = $userIdentifiers;
            $withIdentifiers++;
        }
        $conversions[] = $conversion;
    }

    echo "<pre>[DEBUG] Prepared conversions: " . count($conversions)
        . " | with_gclid={$withGclid}"
        . " | with_user_identifiers={$withIdentifiers}</pre>";
    if (count($conversions) > 0) {
        echo "<pre>[DEBUG] First conversion sample:\n";
        print_r($conversions[0]);
        echo "</pre>";
    }

    $payload = [
        "conversions" => $conversions,
        "partial_failure" => true
    ];

    $headers = [
        "Content-Type: application/json",
        "Authorization: Bearer {$google_ads_api_access_token}",
        "developer-token: {$google_ads_developer_token}"
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $google_ads_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    echo "<pre>[DEBUG] Google Ads API Response:\n";
    print_r($response);
    echo "\nHTTP Code: {$http_code}</pre>";

    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        return ["error" => $err, "http_code" => $http_code];
    }

    $response_array = json_decode($response, true);
    curl_close($ch);
    if ($http_code != 200) {
        return ["error" => $response_array, "http_code" => $http_code];
    } elseif (isset($response_array['partialFailureError'])) {
        return ["error" => $response_array['partialFailureError']['message'], "http_code" => $http_code];
    }
    return ["success" => true, "response" => $response_array, "http_code" => $http_code];
}

/* =========================
   CONFIG (from this file)
========================= */
/* =========================
   CONFIG (from environment — never hardcode secrets)
========================= */
$pipedrive_api_token = getenv('PIPEDRIVE_API_TOKEN') ?: getenv('ENHANCED_PIPEDRIVE_API_TOKEN') ?: '';
$pipedrive_domain = getenv('PIPEDRIVE_COMPANY_DOMAIN') ?: getenv('ENHANCED_PIPEDRIVE_DOMAIN') ?: 'connectgroup2';
if ($pipedrive_domain && strpos($pipedrive_domain, '.') === false) {
    $pipedrive_domain .= '.pipedrive.com';
}

$google_ads_api_access_token = getenv('GOOGLE_ADS_ACCESS_TOKEN') ?: '';
$google_ads_customer_id = getenv('GOOGLE_ADS_CUSTOMER_ID') ?: getenv('ENHANCED_GOOGLE_ADS_CUSTOMER_ID') ?: '7861417556';
$google_ads_developer_token = getenv('GOOGLE_ADS_DEVELOPER_TOKEN') ?: '';
$client_id = getenv('GOOGLE_ADS_CLIENT_ID') ?: '';
$client_secret = getenv('GOOGLE_ADS_CLIENT_SECRET') ?: '';
$refresh_token = getenv('GOOGLE_ADS_REFRESH_TOKEN') ?: '';

$conversion_action = getenv('GOOGLE_ADS_CONVERSION_ACTION') ?: getenv('ENHANCED_GOOGLE_ADS_CONVERSION_ACTION') ?: 'customers/7861417556/conversionActions/6867057737';

if ($pipedrive_api_token === '' || $google_ads_customer_id === '' || $client_id === '' || $client_secret === '' || $refresh_token === '' || $conversion_action === '' || $google_ads_developer_token === '') {
    http_response_code(500);
    echo "<pre>Missing required env for enhanced conversion upload.
"
        . "Need: PIPEDRIVE_API_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
"
        . "GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
"
        . "GOOGLE_ADS_CONVERSION_ACTION (and optional GOOGLE_ADS_ACCESS_TOKEN).
</pre>";
    exit(1);
}


/* =========================
   FETCH + PROCESS
   Keep existing conditions from this file:
   - domain field = 173
   - last 30 days to today window
   - send all leads (with or without gclid)
========================= */
$FIELD_DOMAIN_ID = "af2182f3f2ee03a51c7dcfd898951a268787343c";
$FIELD_GCLID = "d3a15df8cde497d2eb39515f9488f681440cca92";

$startDate = new DateTime('-30 days');
$endDate   = new DateTime('today');
$START = $startDate->format("Y-m-d");
$END = $endDate->format("Y-m-d");

$SELECT = implode(",", [
    "id",
    "add_time",
    "person_name",
    "person_id",
    $FIELD_DOMAIN_ID,
    $FIELD_GCLID,
]);

$limit = 200;
$start = 0;
$status = "all_not_deleted";
$sort = "add_time DESC";
$leads = [];
$pagesFetched = 0;
$rawDealsSeen = 0;
$matchedDomain = 0;
$matchedDate = 0;
$withGclid = 0;
$withoutGclid = 0;
$stopPagination = false;

echo "<pre>Window: {$START} to {$END}\nFilter: {$FIELD_DOMAIN_ID}=173 (all leads, gclid optional)\n</pre>";

do {
    $url = "https://{$pipedrive_domain}/v1/deals"
        . "?api_token={$pipedrive_api_token}"
        . "&start={$start}"
        . "&limit={$limit}"
        . "&status={$status}"
        . "&sort=" . urlencode($sort)
        . "&select=" . urlencode($SELECT);

    $pagesFetched++;
    echo "<pre>[DEBUG] Fetching page {$pagesFetched} | start={$start} | limit={$limit}</pre>";

    $resp = curl_get_json($url);
    if ($resp["error"]) {
        echo "Pipedrive error: " . htmlspecialchars($resp["error"]) . "<br>";
        break;
    }

    $json = json_decode($resp["body"], true);
    if ($json === null || empty($json["data"])) {
        break;
    }

    $pageDeals = count($json["data"]);
    $rawDealsSeen += $pageDeals;
    echo "<pre>[DEBUG] Page {$pagesFetched} returned {$pageDeals} deals.</pre>";

    foreach ($json["data"] as $deal) {
        if (empty($deal["add_time"]) || !isset($deal[$FIELD_DOMAIN_ID])) {
            continue;
        }

        $ts = strtotime($deal["add_time"]);
        if ($ts === false) {
            continue;
        }
        $dealDate = date("Y-m-d", $ts);

        if ($dealDate < $START) {
            $stopPagination = true;
            break;
        }

        if ((int)$deal[$FIELD_DOMAIN_ID] !== 173) {
            continue;
        }
        $matchedDomain++;

        if ($dealDate < $START || $dealDate > $END) {
            continue;
        }
        $matchedDate++;

        $gclid = $deal[$FIELD_GCLID] ?? '';
        if ($gclid === '') {
            $withoutGclid++;
        } else {
            $withGclid++;
        }

        $person = is_array($deal["person_id"] ?? null) ? $deal["person_id"] : [];
        $email = $person["email"][0]["value"] ?? "";
        $phone = $person["phone"][0]["value"] ?? "";

        $lead = [
            "deal_id" => $deal["id"],
            "add_time" => $deal["add_time"],
            "date" => $dealDate,
            "name" => $deal["person_name"] ?? "",
            "gclid" => $gclid,
            "email" => $email,
            "phone" => $phone,
        ];
        $leads[] = $lead;

        echo "Deal #{$lead["deal_id"]} | {$lead["date"]} | GCLID=" . ($lead["gclid"] ?: "N/A")
            . " | Name=" . ($lead["name"] ?: "N/A")
            . " | Email=" . ($lead["email"] ?: "N/A")
            . " | Phone=" . ($lead["phone"] ?: "N/A") . "<br>";
    }

    $pagination = $json["additional_data"]["pagination"] ?? [];
    $more = $pagination["more_items_in_collection"] ?? false;
    $start = $pagination["next_start"] ?? null;

    echo "<pre>[DEBUG] Page {$pagesFetched} done | more_items=" . ($more ? "yes" : "no")
        . " | next_start=" . ($start !== null ? $start : "null") . "</pre>";
    if ($stopPagination) {
        echo "<pre>[DEBUG] Early stop triggered: reached data older than {$START}.</pre>";
    }
} while (($more ?? false) && $start !== null && !$stopPagination);

echo "<br><strong>Total filtered deals:</strong> " . count($leads) . "<br>";
echo "<pre>[DEBUG] Summary:\n"
    . "Raw deals scanned: {$rawDealsSeen}\n"
    . "Matched domain(173): {$matchedDomain}\n"
    . "Matched date window(last 30 days..today): {$matchedDate}\n"
    . "With gclid: {$withGclid}\n"
    . "Without gclid: {$withoutGclid}\n"
    . "Final leads queued: " . count($leads) . "\n"
    . "</pre>";

/* =========================
   SEND TO GOOGLE ADS
========================= */
$google_ads_url = "https://googleads.googleapis.com/v24/customers/{$google_ads_customer_id}:uploadClickConversions";
$result = sendConversionsToGoogleAds($leads, $google_ads_url, $google_ads_api_access_token, $conversion_action, $google_ads_developer_token, $google_ads_customer_id, $client_id, $client_secret, $refresh_token);

if (isset($result['error'])) {
    echo "<pre>Error:\n";
    print_r($result['error']);
    echo "\nHTTP Code: " . ($result['http_code'] ?? 'n/a') . "</pre>";
} elseif (isset($result['success'])) {
    echo "<pre>Conversions uploaded successfully!\n";
    print_r($conversion_action);
    echo "\nLeads sent:\n";
    print_r($leads);
    echo "\nResult:\n";
    print_r($result);
    echo "</pre>";
} else {
    echo "<pre>Unknown error occurred.\n";
    var_dump($result);
    echo "</pre>";
}

?>