# Test API endpoints
$baseUrl = "http://localhost:3001"

# Login and get token
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method POST -ContentType "application/json" -Body '{"username":"testuser","password":"password123"}'
$token = $loginResponse.token
Write-Host "Login successful. Token: $($token.Substring(0, 50))..."

# Get current user
$headers = @{"Authorization" = "Bearer $token"}
$currentUser = Invoke-RestMethod -Uri "$baseUrl/users/current" -Method GET -Headers $headers
Write-Host "Current user: $($currentUser.name) ($($currentUser.username))"
Write-Host "Accounts: $($currentUser.accounts.Count)"

# Display account details
foreach ($account in $currentUser.accounts) {
    Write-Host "  Account: $($account.name) - $($account.number) - $($account.balance) $($account.currency)"
}
