FITCHECK AI

FITCHECK AI is a personal styling web app. Sign in, save clothing items in a private wardrobe, then ask for outfit ideas based on your plans, preferences, and clothes.

## Features

- Email and password accounts powered by Supabase Auth
- Private wardrobe items with optional photos
- Row Level Security (RLS) so signed-in users can access only their own wardrobe data
- Outfit suggestions and style chat through an n8n webhook with Google Gemini
- Text-only outfit cards

> **Image note:** This edition does not generate mannequin or model images. Wardrobe photos can be saved privately in Supabase, but they are not sent to n8n.

## How it works

The browser app talks to a small Node.js server. The server verifies the Supabase sign-in session, then forwards outfit and chat requests to n8n. Supabase stores account and wardrobe data, including private wardrobe photos.

```text
Browser -> Node.js server -> Supabase Auth / n8n
                         -> Supabase wardrobe and private photo storage
```

## Requirements

- Node.js
- A Supabase project
- A published n8n outfit workflow
- Internet access for Supabase and the Supabase browser library CDN

## Setup

1. Create a Supabase project.
2. In **Project Settings -> API**, copy the **Project URL** and **publishable key** (or legacy `anon` key). Do not use a `secret` or `service_role` key.
3. In **SQL Editor**, run the contents of [`supabase-setup.sql`](supabase-setup.sql).
4. In **Authentication -> URL Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**` as a redirect URL.
5. Copy `env.example` to `.env` and fill in your own settings:

   ```text
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-publishable-or-anon-key
   N8N_WEBHOOK_URL=https://your-n8n-host/webhook/fitcheck-outfit
   N8N_WEBHOOK_TOKEN=your-private-header-value
   ```

6. In n8n, configure the Webhook node to use **Header Auth** with header name `x-fitcheck-key`. Use the same private value as `N8N_WEBHOOK_TOKEN`, then publish the workflow and use its **Production URL**.
7. Start the website from the project folder:

   ```bash
   npm start
   ```

8. Open http://localhost:3000.

No `npm install` is needed. Restart the server after changing `.env`.

## n8n response

The workflow should return valid JSON in this general shape:

```json
{
  "answer": "A short helpful response",
  "outfits": [
    {
      "title": "Look name",
      "description": "Why this outfit works",
      "items": ["White shirt", "Dark trousers"]
    }
  ]
}
```

The website sends wardrobe item names, categories, and colors to n8n. Photo files and image URLs are not sent.

## Security

- `.env` is excluded by `.gitignore`. Keep it private and never commit it.
- Never put Supabase secret/service-role keys or the n8n token in browser code.
- Keep the Supabase RLS policies from `supabase-setup.sql` enabled.
- If a credential is accidentally shared, rotate it in the relevant service and update your local `.env`.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | App page structure |
| `app.js` | Authentication, wardrobe, outfit requests, and chat |
| `styles.css` | App styling |
| `server.js` | Local web server and secure n8n request forwarding |
| `env.example` | Template for local environment settings |
| `supabase-setup.sql` | Wardrobe schema, RLS, and private photo storage policies |
| `START-HERE.md` | Detailed setup and n8n workflow notes |

## Current limitations

- Outfit suggestions are text-only; there is no generated model/mannequin image flow.
- Shopping mode gives ideas; live products, prices, stock, and purchase links require a retailer catalogue/API.
- This project runs locally by default and is not deployed as a public hosted service.

## License

No license has been added yet. Ask the project owner before reusing or redistributing this project.
