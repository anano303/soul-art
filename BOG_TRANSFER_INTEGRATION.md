# BOG Bank Transfer Integration

## Overview
Automatic bank transfer integration with Bank of Georgia (BOG) API for seller withdrawals. Sellers now receive instant payments instead of waiting 5 days for manual processing.

## ⚠️ Dual Authentication Architecture

**IMPORTANT**: This integration uses TWO separate BOG Business Online accounts for security:

### 1. **Admin Panel Account** (OAuth2 - View Only)
- **Purpose**: Admin dashboard viewing and monitoring
- **Permissions**: VIEW accounts, balances, documents
- **Authentication**: OAuth2 authorization code flow
- **Credentials**: `BOG_BONLINE_CLIENT_ID` + `BOG_BONLINE_CLIENT_SECRET`
- **Token Storage**: Separate OAuth token cache (`oauthAccessToken`, `oauthRefreshToken`)
- **Used for**:
  - Viewing account balance
  - Checking document status
  - Admin panel UI data

### 2. **Withdrawal Account** (Client Credentials - Sign Permissions)
- **Purpose**: Actual money transfers and document signing
- **Permissions**: SIGN documents, CREATE transfers, EXECUTE withdrawals
- **Authentication**: Client credentials flow
- **Credentials**: `BOG_WITHDRAWAL_CLIENT_ID` + `BOG_WITHDRAWAL_CLIENT_SECRET`
- **Token Storage**: Separate withdrawal token cache (`withdrawalAccessToken`, `withdrawalTokenExpiry`)
- **Used for**:
  - Creating transfer documents
  - Signing documents with OTP
  - Executing seller withdrawals
  - Batch transfers

### Why Two Accounts?

BOG's security model requires **separate credentials for viewing vs signing**:
- Admin panel users can browse data safely without risking actual money transfers
- Withdrawal operations use dedicated credentials with proper signing permissions
- Token separation prevents accidental use of viewing credentials for withdrawals
- Follows principle of least privilege

### Token Flow

```
Admin Panel Access:
User → OAuth Login → oauthAccessToken (cached) → View Balance/Docs

Withdrawal Operation:
System → Client Credentials → withdrawalAccessToken (cached) → Sign & Transfer
```

## Features
- **Instant Transfers**: Money transferred immediately upon withdrawal request
- **Automatic Processing**: No admin intervention required
- **Full Audit Trail**: BOG UniqueKey stored in transaction records
- **Error Handling**: Automatic balance rollback on failed transfers
- **Dual Transfer Types**: BULK (≤10,000 GEL) and MT103 (>10,000 GEL)

## Configuration

### Environment Variables (.env)
```env
# BOG API Base URL
BOG_API_URL=https://api.bog.ge/api
BOG_COMPANY_IBAN=GE72BG0000000609635881
BOG_REDIRECT_URI=https://your-domain.com/api/admin/bog/auth/callback

# Admin Panel Account (OAuth2 - View Only)
BOG_BONLINE_CLIENT_ID={admin panel client id}
BOG_BONLINE_CLIENT_SECRET={admin panel secret}

# Withdrawal Account (Client Credentials - Sign Permissions)
BOG_WITHDRAWAL_CLIENT_ID={withdrawal client id}
BOG_WITHDRAWAL_CLIENT_SECRET={withdrawal secret}

# Default bank code for transfers
BOG_RTGS_CODE=BAGAGE22
```

**Note**: You must create TWO separate applications in BOG Business Online portal with different permission scopes.

## Architecture

### Files Created
- `/server/src/payments/services/bog-transfer.service.ts` - BOG transfer service

### Files Modified
- `/server/.env` - Added BOG configuration
- `/server/src/users/services/balance.service.ts` - Integrated BOG transfers
- `/server/src/users/users.module.ts` - Imported PaymentsModule
- `/server/src/payments/payments.module.ts` - Added BogTransferService

## How It Works

### Withdrawal Flow
1. **Seller requests withdrawal** via `/balance/withdrawal/request`
2. **System validates**:
   - Sufficient balance
   - Valid IBAN (must start with "GE")
   - Identification number exists
3. **Balance temporarily deducted**:
   - `totalBalance` decreased
   - `pendingWithdrawals` increased
4. **BOG transfer initiated**:
   - OAuth2 authentication
   - Transfer request sent to BOG API
5. **Success scenario**:
   - `pendingWithdrawals` decreased
   - `totalWithdrawn` increased
   - Transaction created with type `withdrawal_completed`
   - Email notification sent to seller
   - BOG UniqueKey stored for tracking
6. **Failure scenario**:
   - Balance restored automatically
   - Transaction created with type `withdrawal_failed`
   - Error message returned to seller

### BOG Transfer Service Methods

#### `getAccessToken()`
- Authenticates with BOG using OAuth2
- Caches token until expiry
- Automatically refreshes when needed

#### `transferToSeller(transferRequest)`
- Validates IBAN format (must start with "GE")
- Validates amount (must be > 0)
- Determines dispatch type (BULK or MT103)
- Sends transfer request to BOG API
- Returns `uniqueKey` for tracking

#### `batchTransferToSellers(transfers)`
- Processes multiple transfers in one request
- Useful for bulk payouts

## API Parameters

### BOG Transfer Request
```typescript
{
  beneficiaryAccountNumber: string;  // Seller's IBAN
  beneficiaryInn: string;           // Seller's ID number
  beneficiaryName: string;          // Seller's full name
  amount: number;                   // Transfer amount in GEL
  nomination: string;               // Transfer description
  beneficiaryBankCode?: string;     // Default: BAGAGE22
}
```

### BOG API Response
```typescript
{
  resultCode: number;    // 1 = success, 0 = failure
  match: number;         // Account match percentage
  uniqueKey: string;     // Transaction tracking ID
  description: string;   // Result description
}
```

## Required Seller Data

For BOG transfers to work, sellers must have:
- `accountNumber` - Valid Georgian IBAN (starts with "GE")
- `identificationNumber` - Personal or company ID number
- `ownerFirstName` and `ownerLastName` - For beneficiary name

## Transfer Types

### BULK Transfers (≤10,000 GEL)
- Faster processing
- Lower fees
- Standard for most withdrawals

### MT103 Transfers (>10,000 GEL)
- International standard
- Required for large amounts
- Automatically selected by system

## Transaction Types

### `withdrawal_completed`
- Balance successfully transferred
- Contains BOG UniqueKey in description
- Email notification sent

### `withdrawal_failed`
- Transfer failed
- Balance restored automatically
- Error message in description
- No amount deducted

## Error Handling

### Validation Errors
```
არასაკმარისი ბალანსი - Insufficient balance
ბანკის ანგარიშის ნომერი არ არის მითითებული - No IBAN provided
პირადი ნომერი არ არის მითითებული - No ID number provided
არასწორი ბანკის ანგარიშის ფორმატი - Invalid IBAN format
```

### BOG API Errors
- Authentication failure → Token refresh attempted
- Invalid IBAN → Clear error message
- Network error → Balance rollback
- Result code ≠ 1 → Transfer failed

### Automatic Rollback
All errors trigger automatic rollback:
1. `totalBalance` increased (restore money)
2. `pendingWithdrawals` decreased (clear pending)
3. User model balance updated
4. Failed transaction recorded

## Testing Checklist

### Before Production
- [ ] Test with valid BOG account IBAN
- [ ] Test with valid other bank IBAN
- [ ] Test with invalid IBAN format
- [ ] Test amount < 10,000 (BULK)
- [ ] Test amount > 10,000 (MT103)
- [ ] Test insufficient balance
- [ ] Test missing IBAN
- [ ] Test missing ID number
- [ ] Verify OAuth2 token refresh
- [ ] Verify transaction logging
- [ ] Verify email notifications
- [ ] Test balance rollback on error

### Monitoring
- Check logs for BOG UniqueKey on success
- Monitor failed transactions
- Verify email delivery
- Track OAuth2 token refreshes

## Benefits

### For Sellers
✅ **Instant payments** - Money arrives immediately, not 5 days later  
✅ **Automatic processing** - No waiting for admin approval  
✅ **Transparent tracking** - BOG UniqueKey for bank reference  
✅ **Better UX** - Clear error messages if something fails

### For SoulArt
✅ **No manual work** - Eliminates admin withdrawal processing  
✅ **Complete audit trail** - Every transfer tracked with UniqueKey  
✅ **Error recovery** - Automatic balance rollback prevents issues  
✅ **Scalable** - Handles unlimited withdrawals automatically

## Future Enhancements

### Potential Additions
- Webhook for transfer status updates
- Scheduled batch payouts (e.g., weekly)
- Transfer history dashboard
- Failed transfer retry mechanism
- BOG account balance monitoring
- Transfer fee tracking

## Support

### BOG API Documentation
- Base URL: https://api.bog.ge/api
- Docs: https://api.bog.ge/docs/en/bonline/documents/domestic

### Internal Support
- Service: `BogTransferService`
- Location: `/server/src/payments/services/bog-transfer.service.ts`
- Integration: `BalanceService.requestWithdrawal()`
