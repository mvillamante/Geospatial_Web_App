# Key Insights AI Integration (Green Index)

The **Key Insights** panel shows an AI-generated summary of Green Index scores for the selected year when the user is on the **Green Index** layer and moves the history/projection year slider.

## Free AI: Groq (Llama)

The backend uses **Groq** (free tier) with **Llama 3.1 8B** to generate short key insights. No credit card required; free tier has generous limits (e.g. 30 RPM, 14.4K requests/day for this model).

### 1. Get a free API key

1. Go to **[Groq Console](https://console.groq.com/keys)**.
2. Sign up or sign in.
3. Create an API key and copy it.

### 2. Configure the backend

Add the key to your environment (e.g. in `backend/.env`):

```env
GROQ_API_KEY=your_api_key_here
```

Restart the Django server after adding the variable.

### 3. Usage

- Open the dashboard, switch to **Choropleth** and select the **Green Index** layer.
- Move the **year slider** (2020–2030).
- The **Key Insights** section will show **"Green Index — [year]"** with an AI-generated summary for that year.

If the key is missing or invalid, the card will show an error; the backend returns 503 with setup instructions. If Groq returns rate limit (429), a data-driven fallback summary is shown automatically.

## Fallback when AI is unavailable

When the API is rate limited or errors, the backend returns a short **data-driven summary** (year, city average, top/bottom barangays) so Key Insights still shows useful content. Results are cached for 10 minutes to reduce API calls.
