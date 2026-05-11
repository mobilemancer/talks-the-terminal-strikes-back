# Speaker Notes Web App - Deployment Guide

## Overview
This is a speaker notes application designed for use on a standing iPad during presentations. It displays slide content with a compact header, integrated timer, and gesture-based navigation.

## Live Deployment

**App URL:** https://zealous-desert-09aaa9703.7.azurestaticapps.net

**Status:** ✅ Production Ready

## Architecture

### Frontend
- **Type:** Azure Static Web App (West Europe)
- **Technologies:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Features:**
  - File selector modal for choosing slide decks
  - Compact header (showing "Speaker Notes" + deck name)
  - Timer row with start/stop controls and mean time calculation
  - Full-height scrollable slide card
  - Gesture navigation (swipe left/right)
  - Keyboard navigation (arrow keys)

### Backend
- **Type:** Azure Functions (.NET 10, C#, isolated worker)
- **Region:** Sweden Central
- **Endpoints:**
  - `POST /api/list-slides` — Returns array of available slide file names
  - `POST /api/get-slide?filename=X` — Returns validated slide JSON
- **Storage:** Azure Blob Storage (Sweden Central)

### Infrastructure
- **Resource Group:** `rg-speaker-notes-se` (Sweden Central)
- **Storage Account:** `spknotes26051120036324` (Sweden Central)
  - Container: `slide-decks`
- **Functions App:** `func-speaker-notes-26051120036324` (Sweden Central)
- **Static Web App:** `swa-speaker-notes-26051120036324` (West Europe)

## Slide Deck Format

Slide decks are stored as JSON files in Azure Blob Storage. Each deck must follow this format:

```json
{
  "slides": [
    {
      "headlines": "Main Title",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "headlines": "Architecture at a glance",
      "sections": [
        {
          "header": "Functions API",
          "bullets": ["Lists decks", "Validates payloads"]
        },
        {
          "header": "Blob Storage",
          "bullets": ["Stores JSON slide decks"]
        }
      ]
    }
  ]
}
```

### Field Definitions
- **headlines** (string or array, optional when `sections` is present): Main headline(s) for the slide.
- **bullets** (array, optional): Legacy bullet points rendered when `sections` is not present.
- **sections** (array, optional): Multi-section slide content.
  - **header** (string, required): Section heading.
  - **bullets** (array, optional): Bullet points for that section.

A slide must provide either `headlines` or `sections`. Legacy slides remain supported.

### Example
```json
{
  "slides": [
    {
      "headlines": "The Terminal Strikes Back",
      "bullets": ["Agentic Engineering", "CLI-based Development", "Context Management"]
    },
    {
      "headlines": "Architecture at a glance",
      "sections": [
        {
          "header": "Static Web App",
          "bullets": ["Serves the UI", "Calls backend APIs"]
        },
        {
          "header": "Functions API",
          "bullets": ["Lists files", "Validates slides"]
        },
        {
          "header": "Blob Storage",
          "bullets": ["Persists uploaded decks"]
        }
      ]
    },
    {
      "headlines": "Questions?",
      "bullets": []
    }
  ]
}
```

## Using the App

### On iPad
1. Open the app URL: https://zealous-desert-09aaa9703.7.azurestaticapps.net
2. File selector modal appears — choose your slide deck
3. Slides load and first slide displays with timer controls
4. **Navigation:**
   - Swipe left/right to move between slides
   - Or use arrow keys (← →)
5. **Timer (First Slide Only):**
   - Click "Start" button to enter session length
   - Timer begins counting elapsed time
   - Shows remaining time and mean time per remaining slide
   - Click "Pause" or "Stop" to control timer
6. Navigate through slides while timer continues running in top-right

### Layout Details
- **Header:** 59px (compact)
  - "Speaker Notes" title
  - Current deck name
- **Timer Row:** 61px
  - Elapsed time / Total time (mean per slide)
  - Start/Pause/Stop button (right-aligned)
- **Slide Card:** Fills remaining screen with scrolling support
  - Large, readable typography
  - Optimized for viewing from stage distance

## Adding New Slide Decks

1. Create a JSON file following the format above
2. Upload to Azure Blob Storage container `slide-decks`
   ```bash
   az storage blob upload --account-name spknotes26051120036324 \
     --container-name slide-decks --name your-deck.json --file your-deck.json
   ```
3. File will be available in the app's file selector modal on next load

## GitHub Actions CI/CD

Two workflows automatically deploy on push to `main`:

1. **deploy-functions.yml**
   - Builds .NET 10 Functions project
   - Publishes to Azure Functions (Sweden Central)

2. **deploy-swa.yml**
   - Builds frontend assets
   - Deploys to Static Web App (West Europe)

**Triggering Deployments:**
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Monitor deployments in GitHub Actions tab.

## API Documentation

### List Slides
```
POST /api/list-slides
Response: ["agenda.json", "architecture.json", "closing.json"]
```

### Get Slide
```
POST /api/get-slide?filename=agenda.json
Response: {
  "filename": "agenda.json",
  "isValid": true,
  "slideSet": {
    "slides": [...]
  },
  "errors": []
}
```

**Error Response (invalid JSON):**
```
HTTP 422
{
  "filename": "bad.json",
  "isValid": false,
  "slideSet": null,
  "errors": ["Slide validation failed: ..."]
}
```

## Timer Calculation

The timer calculates **mean time per remaining slide**:
- User enters total session length (e.g., 45 minutes)
- Mean time = remaining session length ÷ remaining slides
- Example: 45 min total, 20 slides = 2:15 per slide
- When you advance to slide 10 of 20, remaining = (elapsed + mean × remaining slides) to calculate new mean

## Verification Testing

The app has been verified with:
- ✅ All 3 sample slide decks loading correctly
- ✅ Timer functionality (start, pause, calculation)
- ✅ Navigation (keyboard arrows, swipe gestures)
- ✅ iPad layout (1024×1366 portrait)
- ✅ Scrolling for overflowing content
- ✅ Error handling (missing files, invalid JSON)
- ✅ CORS configuration (frontend ↔ Functions API)

## Troubleshooting

**App won't load:**
- Check browser console for errors
- Verify Static Web App URL is accessible
- Check GitHub Actions workflow status

**Slide deck won't appear in file selector:**
- Verify JSON file is in Blob Storage container `slide-decks`
- Check Functions API: `POST /api/list-slides` returns the file name
- Verify JSON follows the required format

**Timer doesn't appear:**
- Timer only shows on first slide
- Click "Start" to initialize timer
- Verify you enter a valid session length (minutes)

**Navigation not working:**
- Try keyboard arrows first
- For swipe: ensure you're on the slide card area, not header/timer
- Try refreshing the page

## Support

For issues or questions, check:
1. Browser console (F12 → Console tab) for error messages
2. GitHub Actions workflow logs for deployment failures
3. Azure Portal resource status and logs
