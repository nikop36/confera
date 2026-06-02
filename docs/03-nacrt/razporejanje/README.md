# Scheduling Module

This document describes the scheduling data model, API behavior, and Firestore index requirements.

## Collections

### `rooms`

Room catalog used for meeting placement.

Fields:
- `name: string`
- `location?: string`
- `capacity: number`
- `active: boolean`
- `createdAt: timestamp`

### `timeSlots`

Discrete meeting slots that can be generated in bulk.

Fields:
- `startAt: timestamp`
- `endAt: timestamp`
- `createdAt: timestamp`

### `meetings`

Assigned meetings with grouped participants.

Fields:
- `slotId: string`
- `roomId: string`
- `requestedByUids: string[]`
- `requestedToUids: string[]`
- `participantUids: string[]`
- `status: 'scheduled' | 'completed' | 'cancelled'`
- `createdAt: timestamp`

## Safety Rules Implemented

- Room cannot be deleted if any meetings reference it.
- Time slot cannot be deleted if any meetings reference it.
- Time slot cannot be updated if any meetings reference it.
- Room conflict prevention: only one scheduled meeting per room+slot.
- Participant conflict prevention: participant cannot be in two scheduled meetings in the same slot.

## Key Endpoints

- `POST /scheduling/rooms`
- `GET /scheduling/rooms`
- `GET /scheduling/rooms/all`
- `PATCH /scheduling/rooms/:id`
- `DELETE /scheduling/rooms/:id`

- `POST /scheduling/time-slots/generate`
- `GET /scheduling/time-slots`
- `PATCH /scheduling/time-slots/:id`
- `DELETE /scheduling/time-slots/:id`

- `POST /scheduling/meetings/assign`
- `GET /scheduling/meetings`
- `PATCH /scheduling/meetings/:id/status`
- `DELETE /scheduling/meetings/:id`

## Firestore Composite Indexes

Create the following composite indexes in Firestore:

1. Collection: `timeSlots`  
   Fields:
   - `startAt` ascending
   (used with range + order by in `listTimeSlotsInRange`)

2. Collection: `meetings`  
   Fields:
   - `roomId` ascending
   - `slotId` ascending
   - `status` ascending
   (used in room conflict query)

3. Collection: `meetings`  
   Fields:
   - `slotId` ascending
   - `status` ascending
   - `participantUids` array contains
   (used in participant conflict query)

4. Collection: `meetings`  
   Fields:
   - `createdAt` descending
   (used in list meetings sorted by newest)

5. Collection: `rooms`  
   Fields:
   - `createdAt` descending
   (used in list all rooms sorted by newest)

Depending on Firestore behavior and project settings, some single-field indexes may be automatically available; keep this list as the explicit expected index baseline for scheduling queries.

