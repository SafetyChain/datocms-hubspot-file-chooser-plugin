# DatoCMS HubSpot PDF Chooser Plugin

A professional DatoCMS plugin that enables users to search, browse, and select PDF files from their HubSpot account. The plugin stores the selected file's URL in a DatoCMS field, eliminating the need to manually copy URLs from HubSpot hundreds of times.

## Features

- 🔍 **Intelligent Search**: Custom search interface with magnifying glass icon and modern styling
- 📁 **Bulk Loading**: Loads all PDFs from HubSpot (up to 1000) with automatic pagination
- ⚡ **Smart Caching**: 24-hour localStorage cache with manual refresh option
- 🎯 **Client-side Filtering**: Fast search through loaded files (bypasses HubSpot's limited search API)
- 📱 **Responsive Design**: Clean, paginated interface showing 25 files per page
- ✅ **Selection Tracking**: Shows currently selected file with reverse URL lookup
- 🎨 **DatoCMS Integration**: Matches DatoCMS styling with colfax-web fonts and proper UI components

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the project root:
```
HUBSPOT_API_KEY=your_hubspot_private_app_token
```

### 3. Development
```bash
npm run dev
```
This starts the webpack dev server on http://localhost:5173

### 4. Production Build
```bash
npm run build
```

### 5. Deploy to Vercel
The project includes Vercel configuration with serverless API functions:
```bash
# Deploy with Vercel CLI
vercel --prod
```

## DatoCMS Configuration

### 1. Install Plugin
1. Go to your DatoCMS project settings
2. Navigate to Plugins
3. Add plugin using your deployed URL or local development URL
4. Configure the HubSpot Access Token in plugin settings

### 2. Configure Field
1. Create or edit a field in your model
2. Set field type to `String` (stores the PDF URL)
3. In field settings, choose "HubSpot PDF Chooser" as the field extension

### 3. HubSpot Access Token
1. In HubSpot, create a Private App with Files scope
2. Copy the access token
3. Enter it in the DatoCMS plugin settings

## Architecture

### Frontend Components
- **`FileSelector.js`**: Main component with search, pagination, and file selection
- **`ConfigScreen.js`**: Plugin configuration screen for HubSpot token
- **`index.js`**: Plugin entry point and DatoCMS SDK integration

### API Integration
- **Development**: Webpack dev server proxy (`webpack.config.js`)
- **Production**: Vercel serverless function (`api/hubspot-search.js`)

### Key Features Implementation
- **Caching**: Uses localStorage with 24-hour expiration and cache keys based on token
- **Search**: Client-side filtering since HubSpot's search API has limitations
- **Pagination**: HubSpot API pagination to load large file sets
- **URL Handling**: Proper encoding/decoding of file URLs
- **State Management**: React hooks for loading, filtering, and selection states

## API Endpoints

### `/api/hubspot-search`
**GET** - Searches and retrieves PDF files from HubSpot

**Query Parameters:**
- `q` (optional): Search query
- `limit` (optional): Max results (default: 500)

**Response:**
```json
{
  "results": [
    {
      "id": "file_id",
      "name": "filename.pdf", 
      "url": "https://hubspot-url.com/file.pdf",
      "size": 12345,
      "path": "/folder/path",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Troubleshooting

### Common Issues
1. **No PDFs Loading**: Check HubSpot API token has Files scope
2. **CORS Errors**: Ensure proxy/API function is working correctly
3. **Search Not Working**: Plugin uses client-side search, not HubSpot's search API
4. **Selected File Not Showing**: Plugin performs reverse lookup based on stored URL

### Development Tips
- Use browser console to debug API calls and file selection
- Check localStorage for cached data and timestamps
- Verify HubSpot token permissions in HubSpot settings

## Technology Stack

- **Frontend**: React 18, DatoCMS React UI components
- **Build**: Webpack 5 with Babel
- **API**: HubSpot Files v3 API
- **Deployment**: Vercel with serverless functions
- **Styling**: Inline styles with DatoCMS design tokens

## License

Private project for internal use.