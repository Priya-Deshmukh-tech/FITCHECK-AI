# FITCHECK AI — Full-stack starter

This ZIP contains a real web app scaffold for email/password accounts, a private online wardrobe, outfit requests, a style-chat panel, and n8n connections. It is designed to run locally first.

**It is not a ready-hosted service.** You must create your own Supabase project, enter its public project settings, and configure/publish the n8n workflows. No private keys or paid service accounts can be included in a ZIP. Outfit suggestions are text-only; there is no generated mannequin image.

## What you get

- Email/password sign-up and sign-in handled by Supabase Auth. The app never writes passwords into its own database; Supabase Auth manages authentication.
- A Postgres wardrobe table with row-level rules so a signed-in user can access only their own entries.
- A private photo bucket with per-user folder policies and signed photo previews.
- Outfit requests sent server-to-server to n8n. The server checks the Supabase sign-in token and adds the verified user ID; it does not trust a user ID supplied by the browser.
- A style-chat panel that sends `mode: "chat"` to n8n.
- Shop-mode request and budget fields. The interface can display product objects returned by n8n, but live retailer products, prices, and affiliate links need an actual retailer catalogue/API.
- Text-only outfit idea cards.

## A. Create the Supabase backend

1. Create a Supabase project in your own account and wait for it to finish provisioning.
2. In **Project Settings → API**, copy the Project URL and the **publishable key** (or legacy `anon` key). These are designed to be used by the browser when Row Level Security is enabled. Never use a `secret` or `service_role` key in this project.
3. Open **SQL Editor**, paste all of `supabase-setup.sql`, and run it. It creates the wardrobe table, user-only row policies, a private photo bucket, and user-only photo policies.
4. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/**` as a redirect URL.
5. Email/password sign-up is enabled by default. For a first test, keep email confirmation enabled and use an inbox you can open. Supabase's default email sender is rate-limited; custom SMTP is needed for a real public launch.

The policies in the SQL file are important: they are what keep one account from reading another account’s wardrobe. Do not remove them.

## B. Configure the project

1. Extract the ZIP.
2. Copy `env.example` and rename the copy to `.env` (make sure Windows did not call it `.env.txt`).
3. Fill in these values in `.env`:

   ```text
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-publishable-or-anon-key
   N8N_WEBHOOK_URL=https://your-n8n-host/webhook/fitcheck-outfit
   N8N_WEBHOOK_TOKEN=the-same-secret-you-set-in-n8n
   ```

   Do not put a Supabase secret/service key in `.env` for this starter. Never send these values in chat or commit `.env` to Git.

4. Run `npm start` in a terminal opened in the extracted folder.
5. Visit **http://localhost:3000**. Create an account, confirm its email, then sign in.

This uses Node.js built-ins and the Supabase browser SDK CDN; no `npm install` is needed. An internet connection is needed for Supabase and the SDK CDN.

## C. Update your existing outfit workflow

Keep the working workflow named **FITCHECK AI – Generate Outfit**. The request comes through the current Webhook, Edit Fields, Basic LLM Chain, and Respond to Webhook nodes.

### Protect the webhook

- In the Webhook node set **Authentication → Header Auth**.
- Create a credential with header name `x-fitcheck-key` and a long private value.
- Put that same value after `N8N_WEBHOOK_TOKEN=` in `.env`.
- The website server sends it to n8n. The browser never receives it.
- Publish only after testing. Copy the Webhook **Production URL** into `N8N_WEBHOOK_URL` and restart the local site.

### Preserve the mapped fields

The Edit Fields node should map the incoming body fields as you already configured:

| Output field | Webhook expression |
| --- | --- |
| `prompt` | `{{ $json.body.prompt }}` |
| `mode` | `{{ $json.body.mode }}` |
| `occasion` | `{{ $json.body.occasion }}` |
| `season` | `{{ $json.body.season }}` |
| `budget` | `{{ $json.body.budget }}` |
| `fit` | `{{ $json.body.profile.fit }}` |
| `wardrobe` | `{{ $json.body.wardrobe }}` |

Also keep `Include Other Input Fields` on. The server adds verified `userId` and `userEmail` beside the request. The browser does not choose the trusted user ID.

### Adjust the Basic LLM Chain prompt

The website sends a request mode of `wardrobe`, `shop`, or `chat`. Update the prompt to handle all three. Tell Gemini:

- For `wardrobe`, use only the supplied wardrobe descriptions.
- For `shop`, propose a complete new look within budget, but do not invent live listings/prices. Include product objects only when a real catalogue node supplies products.
- For `chat`, answer the user's style question conversationally using the supplied wardrobe.
- Return **valid JSON only** in this shape so the website can build outfit cards:

   ```json
   {
     "answer": "Short helpful intro or chat response",
     "outfits": [
       {
         "title": "Look name",
         "description": "Explain the combination and why it fits",
         "items": ["White linen shirt", "Black skirt"]       }
     ]
   }
   ```

- Set **Respond to Webhook → Respond With → First Incoming Item**. The website can parse a JSON object returned in the chain's `text` field.

The website sends wardrobe item names, categories, and colors to n8n so it can write text outfit suggestions. Wardrobe photos stay in the private Supabase bucket and are not sent to n8n.

## D. Text-only outfit cards

Outfit suggestions are displayed as text cards with a title and description. The website does not call an image-generation workflow. You can leave `N8N_IMAGE_WEBHOOK_URL` out of `.env`. If you no longer want the separate n8n image workflow, deactivate it in n8n to avoid accidental image-credit use.
## E. Shopping, chat, and style preferences

- **Chat:** The included chat panel calls the same n8n outfit endpoint with `mode: "chat"`. The chain prompt must include the chat behavior above.
- **Shopping:** Until a permitted retailer/product catalogue API is connected, the app can only return outfit ideas and item search descriptions. It cannot promise current stock, prices, or direct purchase links. The UI will display `products` returned by n8n when a product integration is added.
- **Style preference:** Choose Feminine, Masculine, or No preference to guide the wording of outfit suggestions.

## What still needs a decision before public launch

- Choose and configure a retailer catalogue/API and its terms before showing purchasable products.

- Configure custom email delivery, a production domain/HTTPS, backups, monitoring, and appropriate privacy/consent text.
- Host the Node server in a proper server environment. This starter binds to localhost for safe local development and is not a public production host as-is.

## Security reminders

- Supabase stores and verifies passwords through Auth; this app never stores raw passwords.
- Only use a Supabase publishable/anon key in the browser, with the included RLS policies active.
- Never put a Supabase secret/service key, n8n token, or model API key into browser code.
