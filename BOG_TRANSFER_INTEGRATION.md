# BOG Bank Transfer Integration

## Overview
Automatic bank transfer integration with Bank of Georgia (BOG) API for seller withdrawals. Sellers now receive instant payments instead of waiting 5 days for manual processing.

## Features
- **Instant Transfers**: Money transferred immediately upon withdrawal request
- **Automatic Processing**: No admin intervention required
- **Full Audit Trail**: BOG UniqueKey stored in transaction records
- **Error Handling**: Automatic balance rollback on failed transfers
- **Dual Transfer Types**: BULK (≤10,000 GEL) and MT103 (>10,000 GEL)

## Configuration

### Environment Variables (.env)
```env
# BOG API Credentials (already configured)
BOG_CLIENT_ID={client id}
BOG_CLIENT_SECRET={client secret}

# BOG Configuration (newly added)
BOG_COMPANY_IBAN=GE72BG0000000609635881
BOG_API_URL=https://api.bog.ge/api
BOG_RTGS_CODE=BAGAGE22
BOG_BONLINE_CLIENT_ID={bonline client id}
BOG_BONLINE_CLIENT_SECRET={bonline client secret}
```

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
