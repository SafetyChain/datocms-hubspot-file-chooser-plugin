export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, limit = '500' } = req.query;
    const apiKey = process.env.HUBSPOT_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'HubSpot API key not configured' });
    }

    const allResults = [];
    let after = null;
    const maxResults = parseInt(limit);
    
    // Paginate through results
    while (allResults.length < maxResults) {
      const url = new URL('https://api.hubapi.com/files/v3/files/search');
      url.searchParams.set('limit', '100'); // HubSpot max per request
      url.searchParams.set('extension', 'pdf');
      if (q) url.searchParams.set('q', q);
      if (after) url.searchParams.set('after', after);

      console.log('API calling:', url.toString());

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HubSpot API error:', response.status, errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      const results = data.results || [];
      console.log('HubSpot returned:', results.length, 'files, total so far:', allResults.length + results.length);
      
      allResults.push(...results);
      
      // Check if there's more data
      if (!data.paging?.next?.after || results.length === 0) {
        console.log('No more pages, stopping pagination');
        break;
      }
      
      after = data.paging.next.after;
      
      // Safety break to avoid infinite loops
      if (allResults.length >= maxResults) {
        console.log('Reached max results limit:', maxResults);
        break;
      }
    }
    
    console.log('Total files collected:', allResults.length);
    res.json({ results: allResults.slice(0, maxResults) });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}