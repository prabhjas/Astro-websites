<?php
/**
 * Template Name: Conversion Template
 *
 * Hashed version.
 * Pulls deals from 4 months ago to 3 months ago, domain field = 160.
 * Sends all matching deals (not only gclid deals).
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
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
        ],
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($tokenUrl, false, $context);
    $tokens = json_decode($response, true);

    return $tokens['access_token'] ?? null;
}

function isAccessTokenExpired($token) {
    return true; // keep simple for now
}

/* =========================
   NORMALIZATION + HASHING
========================= */

function normalizeEmail($email) {
    $email = trim(strtolower($email));

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

    if (substr($digits, 0, 2) === '00') {
        return '+' . substr($digits, 2);
    }

    if ($hasLeadingPlus) {
        return '+' . $digits;
    }

    if (substr($digits, 0, strlen($countryCode)) === $countryCode) {
        return '+' . $digits;
    }

    if (substr($digits, 0, 1) === '0') {
        return '+' . $countryCode . substr($digits, 1);
    }

    return '+' . $countryCode . $digits;
}

function hashPhone($phone) {
    $normalized = normalizePhone($phone);
    return $normalized ? hash('sha256', $normalized) : '';
}

function normalizeNamePart($namePart) {
    $value = trim(strtolower((string)$namePart));
    if ($value === '') return '';
    // Keep letters/numbers/spaces only for stable hashing input.
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

function sendConversionsToGoogleAds($leads, $google_ads_url, &$access_token, $conversion_action, $developer_token, $customer_id, $client_id, $client_secret, $refresh_token) {

    if (isAccessTokenExpired($access_token)) {
        echo "<pre>[DEBUG] Refreshing Google Ads access token...</pre>";
        $access_token = refreshGoogleAdsToken($client_id, $client_secret, $refresh_token);
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
            if ($hashedEmail) {
                $userIdentifiers[] = ["hashed_email" => $hashedEmail];
            }
        }

        if (!empty($lead['phone'])) {
            $hashedPhone = hashPhone($lead['phone']);
            if ($hashedPhone) {
                $userIdentifiers[] = ["hashed_phone_number" => $hashedPhone];
            }
        }

        if (!empty($lead['name'])) {
            [$firstNameRaw, $lastNameRaw] = splitName($lead['name']);
            $hashedFirstName = hashNamePart($firstNameRaw);
            $hashedLastName = hashNamePart($lastNameRaw);

            $addressInfo = [];
            if ($hashedFirstName) {
                $addressInfo["hashed_first_name"] = $hashedFirstName;
            }
            if ($hashedLastName) {
                $addressInfo["hashed_last_name"] = $hashedLastName;
            }
            if (!empty($addressInfo)) {
                $userIdentifiers[] = ["address_info" => $addressInfo];
            }
        }

        $conversion = [
            "conversion_action" => $conversion_action,
            "conversion_date_time" => $conversionDateTime,
        ];
        if (!empty($lead["gclid"])) {
            $conversion["gclid"] = $lead["gclid"];
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
        "Authorization: Bearer {$access_token}",
        "developer-token: {$developer_token}"
    ];

    $ch = curl_init($google_ads_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    echo "<pre>[DEBUG] Google Ads response:\n";
    print_r($response);
    echo "\nHTTP Code: {$http}</pre>";

    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        return ["error" => $err, "http_code" => $http];
    }
    $response_array = json_decode($response, true);
    curl_close($ch);

    if ($http != 200) {
        return ["error" => $response_array, "http_code" => $http];
    }
    if (isset($response_array["partialFailureError"])) {
        return ["error" => $response_array["partialFailureError"]["message"], "http_code" => $http];
    }
    return ["success" => true, "response" => $response_array, "http_code" => $http];
}

/* =========================
   CONFIG
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
$google_ads_customer_id = getenv('GOOGLE_ADS_CUSTOMER_ID') ?: getenv('ENHANCED_GOOGLE_ADS_CUSTOMER_ID') ?: '5193058564';
$google_ads_developer_token = getenv('GOOGLE_ADS_DEVELOPER_TOKEN') ?: '';
$client_id = getenv('GOOGLE_ADS_CLIENT_ID') ?: '';
$client_secret = getenv('GOOGLE_ADS_CLIENT_SECRET') ?: '';
$refresh_token = getenv('GOOGLE_ADS_REFRESH_TOKEN') ?: '';

$conversion_action = getenv('GOOGLE_ADS_CONVERSION_ACTION') ?: getenv('ENHANCED_GOOGLE_ADS_CONVERSION_ACTION') ?: 'customers/5193058564/conversionActions/7065011011';

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
========================= */
$FIELD_DOMAIN_ID = "af2182f3f2ee03a51c7dcfd898951a268787343c";
$FIELD_STAGE_ID = "2bf691138808151f3d2c838e0a81350ebe4e89ce";
$FIELD_GCLID = "d3a15df8cde497d2eb39515f9488f681440cca92";

$startDate = new DateTime('-2 months');
$endDate   = new DateTime('today');
$START = $startDate->format("Y-m-d");
$END = $endDate->format("Y-m-d");

$SELECT = implode(",", [
    "id",
    "add_time",
    "person_name",
    "person_id",
    $FIELD_DOMAIN_ID,
    $FIELD_STAGE_ID,
    $FIELD_GCLID,
]);

$limit = 200;
$start = 0;
$status = "all_not_deleted";
$sort = "add_time ASC";
$leads = [];

echo "<pre>Window: {$START} to {$END}\nFilter: {$FIELD_DOMAIN_ID}=160 AND {$FIELD_STAGE_ID}=5099\n</pre>";

$pagesFetched = 0;
$rawDealsSeen = 0;
$matchedDomain = 0;
$matchedStage = 0;
$matchedDate = 0;

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
        if (empty($deal["add_time"]) || !isset($deal[$FIELD_DOMAIN_ID]) || !isset($deal[$FIELD_STAGE_ID])) {
            continue;
        }
        if ((int)$deal[$FIELD_DOMAIN_ID] !== 160) {
            continue;
        }
        $matchedDomain++;
        if ((int)$deal[$FIELD_STAGE_ID] !== 5099) {
            continue;
        }
        $matchedStage++;

        $ts = strtotime($deal["add_time"]);
        if ($ts === false) {
            continue;
        }
        $dealDate = date("Y-m-d", $ts);
        if ($dealDate < $START || $dealDate > $END) {
            continue;
        }
        $matchedDate++;

        $person = is_array($deal["person_id"] ?? null) ? $deal["person_id"] : [];
        $email = $person["email"][0]["value"] ?? "";
        $phone = $person["phone"][0]["value"] ?? "";

        $lead = [
            "deal_id" => $deal["id"],
            "add_time" => $deal["add_time"],
            "date" => $dealDate,
            "name" => $deal["person_name"] ?? "",
            "gclid" => $deal[$FIELD_GCLID] ?? "",
            "email" => $email,
            "phone" => $phone,
        ];
        $leads[] = $lead;

        echo "Deal #{$lead["deal_id"]} | {$lead["date"]} | GCLID=" . ($lead["gclid"] ?: "N/A")
            . " | Email=" . ($lead["email"] ? "Y" : "N")
            . " | Phone=" . ($lead["phone"] ? "Y" : "N") . "<br>";
    }

    $pagination = $json["additional_data"]["pagination"] ?? [];
    $more = $pagination["more_items_in_collection"] ?? false;
    $start = $pagination["next_start"] ?? null;

    echo "<pre>[DEBUG] Page {$pagesFetched} done | more_items=" . ($more ? "yes" : "no")
        . " | next_start=" . ($start !== null ? $start : "null") . "</pre>";
} while ($more && $start !== null);

echo "<br><strong>Total filtered deals:</strong> " . count($leads) . "<br>";
echo "<pre>[DEBUG] Summary:\n"
    . "Raw deals scanned: {$rawDealsSeen}\n"
    . "Matched domain(160): {$matchedDomain}\n"
    . "Matched stage/status(5099): {$matchedStage}\n"
    . "Matched date window: {$matchedDate}\n"
    . "Final leads queued: " . count($leads) . "\n"
    . "</pre>";

/* =========================
   SEND
========================= */

$url = "https://googleads.googleapis.com/v20/customers/{$customer_id}:uploadClickConversions";

$result = sendConversionsToGoogleAds(
    $leads,
    $url,
    $access_token,
    $conversion_action,
    $developer_token,
    $customer_id,
    $client_id,
    $client_secret,
    $refresh_token
);

echo "<pre>[DEBUG] Final upload result:\n";
print_r($result);
echo "</pre>";