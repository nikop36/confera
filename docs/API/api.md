# API Documentation

Base URL: `http://localhost:3000`
Interactive docs: `http://localhost:3000/api` (Swagger)

---

## Auth

### POST /auth/register
Register a new user.

**Body**
| Field | Type | Rules |
|---|---|---|
| email | string | valid email format |
| password | string | min 8 chars, 1 uppercase, 1 number |
| displayName | string | required |

**Responses**
| Status | Meaning |
|---|---|
| 201 | User created successfully |
| 400 | Validation failed (bad email, weak password, missing field) |
| 409 | Email already registered |
| 500 | Unexpected server error |

**Success response**
```json
{
  "uid": "firebase-generated-uid",
  "email": "user@example.com"
}
```

---

## Health

### GET /health
Check the server is running.

**Response**
```json
{ "status": "ok" }
```