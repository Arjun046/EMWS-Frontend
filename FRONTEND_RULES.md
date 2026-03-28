# EWMS Frontend Development Rules

Follow these rules to ensure the Vercel-deployed frontend can always communicate with your local machine.

## 1. Environment Configuration
*   **Rule:** Never hardcode API URLs in services or components.
*   **Action:** Always use the `environment` object from `src/environments/environment.ts`.
    ```typescript
    // Correct way
    this.http.get(`${environment.apiBaseUrl}/api/data`)
    ```

## 2. Tunnel Management (Local Development)
*   **Rule:** When connecting a Vercel deployment to a local backend, you **must** use an HTTPS tunnel.
*   **Action:** 
    1. Start a tunnel (Cloudflare or Localtunnel).
    2. Update `environment.ts` with the new URL.
    3. Push to Vercel.

## 3. Mixed Content Security
*   **Rule:** All URLs in `environment.ts` must use secure protocols.
*   **Action:** 
    *   API: Must use `https://`
    *   WebSockets: Must use `wss://`
*   **Reason:** Vercel is strictly HTTPS. It will block any request to an `http://` address (Mixed Content Error).

## 4. Tunnel Whitelisting (Important)
*   **Rule:** Free tunnels often show a "Security Warning" page first.
*   **Action:** Before testing on Vercel, open your active tunnel URL (e.g., `https://xyz.loca.lt`) directly in your browser and click **"Click to Continue"**.
*   **Reason:** If you don't do this, the API calls from Vercel will return a `511` or `403` error because the browser is waiting for that button click.

## 5. Deployment Sync
*   **Action:** Whenever the local backend Docker stack is restarted, verify the tunnel URL. If it changes, the frontend code **must** be updated and redeployed immediately.
