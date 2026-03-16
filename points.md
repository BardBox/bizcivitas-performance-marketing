# Engagement Scoring & Lead Pipeline System

## Overview

This system tracks **user engagement on website pages** and dynamically assigns an **engagement score** based on user behavior.

Based on the score and membership status, users are automatically categorized into a **pipeline stage**:

New → Cold → Warm → Hot → Converted

The **Converted** stage is determined by **payment/membership data from the database**, not by engagement score.

---

# System Goals

* Track user engagement across the website
* Assign scores based on user actions
* Automatically update lead pipeline stage
* Identify highly interested users
* Detect converted users via payment records
* Maintain real-time engagement analytics

---

# Pipeline Stages

| Stage     | Score Range      | Description                         |
| --------- | ---------------- | ----------------------------------- |
| New       | 0 – 10           | First interaction with the platform |
| Cold      | 11 – 25          | Low engagement visitor              |
| Warm      | 26 – 50          | Interested visitor                  |
| Hot       | 51 – 80+         | Highly engaged potential lead       |
| Converted | Payment detected | User has purchased or became member |

Important rule:

Converted users override all engagement scores.

---

# Engagement Scoring Model

User engagement is measured through **behavioral events**.

## Scoring Table

| Event                     | Score |
| ------------------------- | ----- |
| Page visit                | +2    |
| Returning visit           | +5    |
| Stay on page > 30 seconds | +3    |
| Stay on page > 2 minutes  | +8    |
| Scroll 50% page           | +3    |
| CTA click                 | +5    |
| Form started              | +8    |
| Form submitted            | +20   |
| File download             | +10   |
| Pricing page visit        | +15   |
| Multiple page visits (>5) | +10   |

---

# Example User Journey

Visit homepage → +2
Stay 2 minutes → +8
Visit pricing page → +15
Submit form → +20

Total Score = **45**

Pipeline Stage = **Warm**

---

# System Architecture

## Frontend Tracking Layer

Responsible for capturing user interactions.

Tracked events include:

* Page visit
* Time spent on page
* Scroll depth
* CTA clicks
* Form interaction
* Form submission
* File downloads

### Example Tracking Script

```javascript
let startTime = Date.now()

window.addEventListener("beforeunload", () => {
  const timeSpent = (Date.now() - startTime) / 1000

  if (timeSpent > 120) {
    sendEvent("time_2min")
  }
})
```

Event trigger example:

```javascript
document.querySelector("#cta").addEventListener("click", () => {
  sendEvent("cta_click")
})
```

---

# Backend Processing Layer

The backend processes incoming engagement events and updates user scores.

### Score Calculation

```javascript
function calculateScore(action) {
  const scores = {
    visit: 2,
    returnVisit: 5,
    time30sec: 3,
    time2min: 8,
    ctaClick: 5,
    formStart: 8,
    formSubmit: 20,
    pricingVisit: 15
  }

  return scores[action] || 0
}
```

### Update User Score

```javascript
function updateUserScore(userId, action) {
  const score = calculateScore(action)

  db.users.updateOne(
    { id: userId },
    { $inc: { engagementScore: score } }
  )
}
```

---

# Pipeline Assignment Logic

Pipeline stage is determined after each score update.

```javascript
function assignPipeline(score, isMember) {

  if (isMember) return "Converted"

  if (score <= 10) return "New"
  if (score <= 25) return "Cold"
  if (score <= 50) return "Warm"
  return "Hot"
}
```

---

# Database Structure

## Users Collection

```json
{
  "userId": "user123",
  "email": "user@email.com",
  "engagementScore": 42,
  "pipelineStage": "Warm",
  "visits": 3,
  "lastActivity": "form_submit",
  "isMember": false,
  "createdAt": "2026-03-16"
}
```

---

## Activity Log Collection

Tracks user engagement events.

```json
{
  "userId": "user123",
  "event": "cta_click",
  "scoreAdded": 5,
  "timestamp": "2026-03-16T12:00:00Z"
}
```

---

## Payments / Membership Collection

Used to determine converted users.

```json
{
  "userId": "user123",
  "paymentId": "pay_8392",
  "amount": 499,
  "status": "success",
  "membershipActive": true
}
```

---

# Conversion Detection

If a user exists in the **membership/payments table**, the pipeline stage becomes:

Converted

Example logic:

```javascript
if(payment.status === "success"){
   user.pipelineStage = "Converted"
}
```

---

# Engagement Score Decay (Optional but Recommended)

To prevent inactive users from staying in Hot stage forever, implement score decay.

Example:

* If user inactive for **30 days**
* Reduce score

```javascript
score = score - 10
```

---

# Final Pipeline Flow

```
New
 ↓
Cold
 ↓
Warm
 ↓
Hot
 ↓
Converted
```

Users move automatically based on:

* Engagement score updates
* Payment detection

---

# Future Improvements

Possible enhancements:

* AI-based lead scoring
* Predictive conversion models
* Page importance weighting
* User segmentation
* Marketing automation triggers
* CRM integrations

---

# Summary

This engagement scoring system allows the platform to:

* Measure user intent
* Identify high-quality leads
* Automatically segment users
* Track behavioral engagement
* Detect conversions through payment data

The result is a **fully automated lead intelligence pipeline** that continuously updates based on user activity.
