# Testing
---

## Running tests

### Run all tests once
```bash
npm test
```

### Watch mode during development
```bash
npm test -- --watch
```

### Generate a coverage report
```bash
npm test -- --coverage
```

The HTML coverage report is generated at `coverage/lcov-report/index.html`.

---

## Test locations

| File | What it tests |
|---|---|
| `src/auth/__tests__/auth.service.spec.ts` | Registration logic in AuthService |
| `src/app.controller.spec.ts` | Health check endpoint |

---

## AuthService test matrix

### register()

| Case | Input | Expected |
|---|---|---|
| Success | Valid email, strong password, display name | Returns `{ uid, email }` |
| Correct Firebase call | Valid registration data | `createUser` called with exact dto fields |
| Firestore write | Successful Firebase Auth creation | `UsersService.createUser` called with uid, email, displayName, createdAt |
| Duplicate email | Email already in Firebase Auth | Throws `ConflictException` with message "Email already registered" |
| Unknown Firebase error | Firebase throws unexpected error | Throws `InternalServerErrorException` |
| Firestore not called on failure | Firebase Auth creation fails | `UsersService.createUser` is never called |

