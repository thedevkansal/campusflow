# API Contracts

Base URL

/api/v1

## Auth

POST /auth/register

POST /auth/login

POST /auth/refresh — `Authorization: Bearer <refreshToken>`; returns a new access + refresh pair and revokes the presented refresh token (rotation). Replaying a revoked refresh token revokes all of the user's sessions.

POST /auth/logout — access token required; optional body `{ refreshToken }`. Blacklists the access token and revokes that refresh token.

GET /auth/profile

## Drivers

POST /drivers/online

POST /drivers/offline

PATCH /drivers/location

GET /drivers/profile

## Rides

POST /rides

GET /rides/:id

POST /rides/:id/cancel

POST /rides/:id/accept

POST /rides/:id/start

POST /rides/:id/complete

## Ratings

POST /ratings

GET /ratings/driver/:id

## Analytics

GET /analytics/dashboard

GET /analytics/demand

GET /analytics/hotspots

## Response Format

{
  success: true,
  data: {},
  message: ""
}

## Error Format

{
  success: false,
  error: "",
  code: ""
}