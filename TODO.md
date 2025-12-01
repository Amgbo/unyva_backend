# TODO: Fix TypeScript Errors in unyva_backend

## Errors to Fix:
1. adminController.ts:141 - Cannot find name 'getAllDeleteAccountRequests' -> Import from model
2. adminController.ts:183 - Cannot find name 'updateDeleteAccountRequestStatus' -> Import from model
3. deleteAccountController.ts:4 - 'createTransporter' does not exist -> Change to 'createTransport'
4. deleteAccountController.ts:12 - Cannot redeclare block-scoped variable 'submitDeleteAccountRequest' -> Remove duplicate function
5. deleteAccountModel.ts:1 - Module has no default export -> Change import to named import
6. deleteAccountRoutes.ts - Multiple errors: duplicate identifiers, missing imports, wrong router usage

## Steps:
- [ ] Fix adminController.ts imports
- [ ] Fix deleteAccountController.ts: change createTransporter, remove duplicate function
- [ ] Fix deleteAccountModel.ts import
- [ ] Fix deleteAccountRoutes.ts: remove duplicates, add imports, fix router usage
- [ ] Run TypeScript check to verify fixes
