# REST API Endpoint Documentation

> All HTTP endpoints, request/response schemas, and authentication requirements.

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:4000/api` |
| Production | `https://yourdomain.com/api` (via nginx reverse proxy) |

## Authentication

Protected endpoints require the `x-auth-token` header:

```
x-auth-token: <JWT token>
```

Tokens are obtained from login (`POST /api/auth`) or registration (`POST /api/users`).
Token expiry: **1 hour**.

---

## Endpoints

### `POST /api/users` - Register User

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate Limit | 20 requests / 15 minutes |

**Request Body:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "mypassword123"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| name | Required, max 50 chars, trimmed, HTML-escaped |
| email | Valid email format, normalized |
| password | Min 6 chars, max 128 chars |

**Success Response (200):**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "errors": [{ "msg": "User Already exists" }] }` | Email taken |
| 400 | `{ "errors": [...] }` | Validation errors |
| 500 | `"server error"` | Internal error |

---

### `POST /api/auth` - Login User

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate Limit | 20 requests / 15 minutes |

**Request Body:**
```json
{
    "email": "john@example.com",
    "password": "mypassword123"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| email | Valid email format, normalized |
| password | Min 6 chars |

**Success Response (200):**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_name": "John Doe"
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "errors": [{ "msg": "Invalid Credentials" }] }` | Wrong email or password |
| 400 | `{ "errors": [...] }` | Validation errors |
| 500 | `"server error"` | Internal error |

---

### `GET /api/auth` - Get Current User

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:** None

**Success Response (200):**
```json
{
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "//www.gravatar.com/avatar/...",
    "date": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "msg": "No token, authorization denied" }` | Missing token |
| 500 | `"Server error"` | Internal error |

---

### `POST /api/games` - Create Game Room

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:**
```json
{
    "roomname": "My Card Room",
    "player_count": 4,
    "roompass": "secret123",
    "deck_count": 1,
    "bid_threshold": 150
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| roomname | Required, trimmed, HTML-escaped |
| player_count | Integer, min 2, max 10 |
| roompass | Required, min 6 chars, max 128 chars |
| deck_count | Optional (1 or 2, relevant for 6-player games) |
| bid_threshold | Optional (for odd-player team advantage) |

**Success Response (200):**
```json
{
    "room_id": "64a1b2c3d4e5f6g7h8i9j0k1"
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "errors": [{ "msg": "..." }] }` | Validation, room exists, or player already in room |
| 500 | `"server error"` | Internal error |

---

### `GET /api/game-rooms` - List All Rooms

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:** None

**Success Response (200):**
```json
[
    {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "admin": {
            "_id": "user_id",
            "name": "John Doe"
        },
        "roomname": "My Card Room",
        "player_count": 4,
        "deck_count": 1,
        "bid_threshold": null,
        "state": "lobby",
        "players": [
            {
                "playerId": { "_id": "user_id", "name": "John Doe" },
                "ready": true
            }
        ]
    }
]
```

Note: `roompass` is excluded from the response.

---

### `GET /api/game-rooms/players?id=<gameId>` - Get Room Players

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Query Parameters:**
| Param | Rules |
|-------|-------|
| id | Required, valid 24-char hex MongoDB ObjectId |

**Success Response (200):**
```json
{
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "admin": { "_id": "user_id", "name": "Admin Name" },
    "roomname": "My Card Room",
    "player_count": 4,
    "players": [
        {
            "playerId": { "_id": "user_id", "name": "Player Name" },
            "ready": false
        }
    ],
    "state": "lobby"
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid room ID format" }` | Bad ObjectId format |
| 404 | `{ "error": "Room not found" }` | Room doesn't exist |

---

### `POST /api/game-rooms` - Join Game Room (REST)

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:**
```json
{
    "roomname": "My Card Room",
    "roompass": "secret123"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| roomname | Required |
| roompass | Required, min 6 chars |

**Success Response (200):**
```
"Player added in the room"
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "errors": [{ "msg": "..." }] }` | Validation errors |
| 400 | `"Room not found"` | No room with that name |
| 400 | `"Room is full"` | At capacity |
| 400 | `"Invalid password"` | Wrong password |
| 400 | `"Player already in another room"` | User in different room |

---

### `GET /api/mygame` - Get User's Current Game

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:** None

**Success Response (200) - In a game:**
```json
{
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "roomname": "My Card Room"
}
```

**Success Response (200) - Not in a game:**
```json
{
    "msg": "User not in any game-room"
}
```

---

### `DELETE /api/mygame` - Leave Game Room

| Property | Value |
|----------|-------|
| Auth | Private (`x-auth-token`) |

**Request Body:** None

**Success Response (200):**
```
"Player removed from room"
```

**Behavior:**
- If user is **admin**: entire room is deleted, all players' `gameroom` references are cleared.
- If user is **not admin**: player is removed from room, their `gameroom` reference is cleared.

---

## Error Handling

All endpoints return errors in one of these formats:

**Validation errors:**
```json
{
    "errors": [
        { "msg": "Error message", "param": "fieldName", "location": "body" }
    ]
}
```

**Generic errors:**
```
"server error"
```

**Rate limit exceeded:**
```json
{
    "errors": [{ "msg": "Too many requests, please try again later" }]
}
```
