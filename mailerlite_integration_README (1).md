# MailerLite Email Automation Integration

Backend architecture for integrating **MailerLite** with a custom
**website admin panel**.

This system enables:

-   Automatic email sending after form submission
-   Subscriber management via API
-   Email engagement tracking (opens, clicks, unsubscribes)
-   Webhook event processing
-   Data storage for reporting and custom lead scoring

The scoring logic is **not handled here** --- the system only collects
engagement data so your admin panel can calculate scores.

------------------------------------------------------------------------

# System Overview

    Website Form
         │
         ▼
    Backend API
         │
         ├ Save Lead → Database
         │
         ├ Create Subscriber → MailerLite API
         │
         └ Add Subscriber to Group (triggers automation email)
         │
         ▼
    MailerLite
         │
         └ Sends Email
               │
               ▼
    Email Engagement (open / click / unsubscribe)
               │
               ▼
    MailerLite Webhook
               │
               ▼
    Webhook Endpoint (Your Backend)
               │
               ▼
    Store Engagement Event in Database
               │
               ▼
    Admin Panel Reports + Lead Scoring Engine

------------------------------------------------------------------------

# Features

-   Form submission email automation
-   MailerLite subscriber management
-   Webhook event processing
-   Engagement tracking
-   Admin reporting support
-   Modular architecture for scaling

------------------------------------------------------------------------

# Project Structure

    backend/
    │
    ├ controllers/
    │   ├ formController.js
    │   ├ emailController.js
    │   └ webhookController.js
    │
    ├ services/
    │   ├ mailerliteService.js
    │   └ engagementService.js
    │
    ├ database/
    │   ├ leadModel.js
    │   ├ campaignModel.js
    │   └ eventModel.js
    │
    ├ routes/
    │   ├ formRoutes.js
    │   ├ emailRoutes.js
    │   └ webhookRoutes.js
    │
    ├ config/
    │   └ mailerlite.js
    │
    └ server.js

------------------------------------------------------------------------

# Environment Variables

Create a `.env` file.

    MAILERLITE_API_KEY=your_api_key
    MAILERLITE_BASE_URL=https://connect.mailerlite.com/api
    WEBHOOK_SECRET=your_webhook_secret

------------------------------------------------------------------------

# API Endpoints

## Form Submission

    POST /api/form-submit

### Request

    {
      "name": "John Doe",
      "email": "john@email.com",
      "company": "ABC Ltd"
    }

### Flow

1.  Save lead to database\
2.  Create MailerLite subscriber\
3.  Add subscriber to automation group

------------------------------------------------------------------------

## Send Email (Optional Manual Trigger)

    POST /api/email/send

Used for manual email triggers from admin panel.

------------------------------------------------------------------------

## Email Reports

    GET /api/reports/email

Returns aggregated engagement data stored in your database.

------------------------------------------------------------------------

## MailerLite Webhook Endpoint

    POST /api/webhooks/mailerlite

Receives engagement events.

------------------------------------------------------------------------

# MailerLite API Integration

Base URL

    https://connect.mailerlite.com/api

Headers

    Authorization: Bearer MAILERLITE_API_KEY
    Content-Type: application/json

------------------------------------------------------------------------

# Add Subscriber Example

    POST /subscribers

Body

    {
     "email": "john@email.com",
     "fields": {
       "name": "John"
     },
     "groups": ["FORM_LEADS"]
    }

Adding a subscriber to a group can trigger an **automation workflow**
inside MailerLite.

------------------------------------------------------------------------

# Webhook Configuration

Configure webhooks inside MailerLite dashboard.

Developer → Webhooks

Add endpoint:

    https://yourdomain.com/api/webhooks/mailerlite

------------------------------------------------------------------------

# Webhook Events to Subscribe

    subscriber.opened
    subscriber.clicked
    subscriber.unsubscribed
    subscriber.bounced
    campaign.sent

------------------------------------------------------------------------

# Example Webhook Payload

    {
     "type": "subscriber.clicked",
     "data": {
       "email": "john@email.com",
       "campaign_id": "abc123",
       "timestamp": "2026-03-18T10:30:00Z"
     }
    }

------------------------------------------------------------------------

# Webhook Processing Logic

    Receive Webhook
         │
    Validate Request
         │
    Identify Lead (by email)
         │
    Store Engagement Event
         │
    Return 200 OK

------------------------------------------------------------------------

# Database Schema

## leads

    id
    name
    email
    source
    created_at

------------------------------------------------------------------------

## email_campaigns

    id
    mailer_campaign_id
    name
    subject
    created_at

------------------------------------------------------------------------

## email_events

    id
    lead_id
    campaign_id
    event_type
    event_timestamp
    metadata

------------------------------------------------------------------------

# Event Types

    sent
    open
    click
    unsubscribe
    bounce

These events allow your admin panel to build:

-   engagement reports
-   lead activity timelines
-   custom scoring systems

------------------------------------------------------------------------

# Engagement Data Flow

    Form Submission
          │
          ▼
    Lead Saved
          │
          ▼
    Subscriber Created in MailerLite
          │
          ▼
    Email Sent
          │
          ▼
    User Interaction
          │
          ▼
    MailerLite Webhook
          │
          ▼
    Webhook Handler
          │
          ▼
    Event Stored in Database

------------------------------------------------------------------------

# Security

### Recommended

Verify webhooks using a secret token.

Example endpoint:

    POST /api/webhooks/mailerlite?token=WEBHOOK_SECRET

Reject requests with invalid token.

------------------------------------------------------------------------

# Scaling Strategy

For high traffic systems:

Use a queue system.

    MailerLite Webhook
           │
           ▼
    Webhook API
           │
           ▼
    Message Queue
           │
           ▼
    Event Worker
           │
           ▼
    Database Update

Recommended tools:

-   Redis
-   RabbitMQ
-   BullMQ

------------------------------------------------------------------------

# Admin Panel Features

Suggested modules:

    Dashboard
    Leads
    Email Templates
    Email Campaigns
    Engagement Reports
    Webhook Logs
    Automation Rules

------------------------------------------------------------------------

# Future Enhancements

Possible improvements:

-   AI lead scoring
-   CRM integration
-   multi-email campaign workflows
-   behavioral automation
-   segmentation engine
-   real-time analytics dashboard

------------------------------------------------------------------------

# License

Internal project use.
